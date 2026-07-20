import { useAuthStore } from '@core/auth-store'
import { translate, useLocaleStore, type Locale, type TranslationKey } from '@core/i18n'
import {
  beginLoaderAnimation,
  configureLoader,
  finishLoader,
  reportLoaderStep,
  showLoaderAtZero,
  useLoaderStore,
  waitForPostLoadAuth
} from '@core/loader-store'
import {
  CORE_MODULES,
  getAllModules,
  getModuleLoaderContribution,
  OPTIONAL_MODULES
} from '@core/module-loader'
import type { ModuleLoaderStep } from '@core/module-types'
import { useModulesStore } from '@core/modules-store'
import { useAutoRefreshStore } from '@core/auto-refresh-store'

const MIN_SPLASH_MS = 2800
const STEP_MIN_MS = 160

interface PipelineStep {
  id: string
  statusKey: TranslationKey
  detailKey: TranslationKey
  run?: () => Promise<void>
}

const CORE_STEPS: PipelineStep[] = [
  {
    id: 'init',
    statusKey: 'loader.init.status',
    detailKey: 'loader.init.detail'
  },
  {
    id: 'locale',
    statusKey: 'loader.locale.status',
    detailKey: 'loader.locale.detail',
    run: () => useLocaleStore.getState().hydrate()
  },
  {
    id: 'auto-refresh',
    statusKey: 'loader.autoRefresh.status',
    detailKey: 'loader.autoRefresh.detail',
    run: () => useAutoRefreshStore.getState().hydrate()
  },
  {
    id: 'modules-config',
    statusKey: 'loader.modulesConfig.status',
    detailKey: 'loader.modulesConfig.detail',
    run: () => useModulesStore.getState().hydrate()
  },
  {
    id: 'registry',
    statusKey: 'loader.registry.status',
    detailKey: 'loader.registry.detail'
  }
]

const LATE_STEPS: PipelineStep[] = [
  {
    id: 'auth',
    statusKey: 'loader.auth.status',
    detailKey: 'loader.auth.detail',
    run: () => useAuthStore.getState().hydrate()
  },
  {
    id: 'warmup',
    statusKey: 'loader.warmup.status',
    detailKey: 'loader.warmup.detail'
  },
  {
    id: 'ui',
    statusKey: 'loader.ui.status',
    detailKey: 'loader.ui.detail'
  }
]

function isModuleEnabled(moduleId: string, enabled: Record<string, boolean>): boolean {
  const mod = getAllModules().find((m) => m.id === moduleId)
  if (!mod) return false
  if (!mod.optional) return true
  return enabled[moduleId] !== false
}

function buildModuleSteps(enabled: Record<string, boolean>): PipelineStep[] {
  const steps: PipelineStep[] = []
  const modulesForLoader = [...CORE_MODULES, ...OPTIONAL_MODULES].sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100)
  )

  for (const mod of modulesForLoader) {
    if (!isModuleEnabled(mod.id, enabled)) continue
    const contribution = getModuleLoaderContribution(mod.id)
    const moduleSteps = contribution?.steps ?? [
      {
        statusKey: `loader.module.${mod.id}.status`,
        detailKey: `loader.module.${mod.id}.detail`
      } satisfies ModuleLoaderStep
    ]

    for (const [index, step] of moduleSteps.entries()) {
      steps.push({
        id: `${mod.id}-${index}`,
        statusKey: step.statusKey as TranslationKey,
        detailKey: step.detailKey as TranslationKey,
        run:
          index === 0 && contribution?.prepare
            ? () => contribution.prepare!()
            : undefined
      })
    }
  }

  return steps
}

function buildFullPipeline(enabled: Record<string, boolean>, hasToken: boolean): PipelineStep[] {
  if (!hasToken) {
    return [...CORE_STEPS, LATE_STEPS.find((s) => s.id === 'ui')!]
  }

  return [
    ...CORE_STEPS,
    {
      ...LATE_STEPS.find((s) => s.id === 'auth')!,
      run: () => useAuthStore.getState().hydrate()
    },
    ...buildModuleSteps(enabled),
    {
      ...LATE_STEPS.find((s) => s.id === 'warmup')!,
      run: () => warmupEnabledModules(enabled)
    },
    LATE_STEPS.find((s) => s.id === 'ui')!
  ]
}

async function warmupEnabledModules(enabled: Record<string, boolean>): Promise<void> {
  const mods = getAllModules().filter((m) => isModuleEnabled(m.id, enabled))
  await Promise.all(
    mods.map(async (mod) => {
      try {
        await mod.loadPage()
      } catch {

      }
    })
  )
}

function t(locale: Locale, key: TranslationKey): string {
  return translate(locale, key)
}

function progressBefore(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(99, Math.round((index / total) * 99))
}

function progressAfter(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(99, Math.round(((index + 1) / total) * 99))
}

function makeUpdate(
  locale: Locale,
  step: PipelineStep,
  index: number,
  total: number,
  progress: number
) {
  return {
    progress,
    text: t(locale, step.statusKey),
    detail: t(locale, step.detailKey),
    stepIndex: index + 1,
    totalSteps: total
  }
}

async function runStepWork(step: PipelineStep): Promise<void> {
  if (step.run) {
    await step.run()
  } else {
    await delay(step.id === 'init' ? 180 : 90)
  }
}

async function runStep(step: PipelineStep, minDurationMs: number): Promise<void> {
  const started = performance.now()
  await runStepWork(step)
  const elapsed = performance.now() - started
  if (elapsed < minDurationMs) {
    await delay(minDurationMs - elapsed)
  }
}

function isActivePipeline(session: number): boolean {
  return useLoaderStore.getState().session === session
}

export async function runStartupPipeline(
  session: number,
  hooks?: { onAppReady?: () => void }
): Promise<{ locale: Locale; durationMs: number }> {
  const startedAt = performance.now()
  let locale: Locale = useLocaleStore.getState().locale
  let enabled = useModulesStore.getState().enabled

  await useAuthStore.getState().hydrate()
  let hasToken = Boolean(useAuthStore.getState().token)
  let pipeline = buildFullPipeline(enabled, hasToken)

  configureLoader({
    subtitle: t(locale, 'loader.subtitle'),
    status: t(locale, 'loader.init.status'),
    detail: t(locale, 'loader.init.detail'),
    totalSteps: pipeline.length
  }, session)
  beginLoaderAnimation(session)
  await showLoaderAtZero(makeUpdate(locale, pipeline[0]!, 0, pipeline.length, 0), session)

  for (let index = 0; index < pipeline.length; index++) {
    const step = pipeline[index]!

    reportLoaderStep(
      makeUpdate(locale, step, index, pipeline.length, progressBefore(index, pipeline.length)),
      session
    )

    await runStep(step, STEP_MIN_MS)

    if (step.id === 'modules-config') {
      enabled = useModulesStore.getState().enabled
      locale = useLocaleStore.getState().locale
      hasToken = Boolean(useAuthStore.getState().token)
      pipeline = buildFullPipeline(enabled, hasToken)
    } else if (step.id === 'locale') {
      locale = useLocaleStore.getState().locale
    }

    reportLoaderStep(
      makeUpdate(locale, step, index, pipeline.length, progressAfter(index, pipeline.length)),
      session
    )
  }

  const elapsed = performance.now() - startedAt
  if (elapsed < MIN_SPLASH_MS) {
    const remaining = MIN_SPLASH_MS - elapsed
    const from = progressAfter(pipeline.length - 1, pipeline.length)
    const ticks = Math.max(4, Math.ceil(remaining / 120))
    for (let i = 1; i <= ticks; i++) {
      const progress = Math.min(99, Math.round(from + ((99 - from) * i) / ticks))
      reportLoaderStep({
        progress,
        text: t(locale, 'loader.ui.status'),
        detail: t(locale, 'loader.ui.detail'),
        stepIndex: pipeline.length,
        totalSteps: pipeline.length
      }, session)
      await delay(remaining / ticks)
    }
  }

  reportLoaderStep({
    progress: 100,
    text: t(locale, 'loader.ready.status'),
    detail: '',
    stepIndex: pipeline.length,
    totalSteps: pipeline.length
  }, session)

  if (!useAuthStore.getState().token) {
    hooks?.onAppReady?.()
    await waitForPostLoadAuth(session)
    if (!isActivePipeline(session)) {
      return { locale, durationMs: performance.now() - startedAt }
    }
    await warmupEnabledModules(useModulesStore.getState().enabled)
  }

  const finishPayload = {
    status: t(locale, 'loader.ready.status'),
    subtitle: t(locale, 'loader.subtitleDone')
  }

  hooks?.onAppReady?.()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  await finishLoader(finishPayload, session)

  return { locale, durationMs: performance.now() - startedAt }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
