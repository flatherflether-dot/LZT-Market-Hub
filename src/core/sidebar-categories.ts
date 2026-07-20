import type { TranslationKey } from '@core/i18n'
import type { LoadedModule } from '@core/module-types'

export const SIDEBAR_CATEGORIES: Array<{
  labelKey: TranslationKey
  moduleIds: string[]
}> = [
  { labelKey: 'sidebar.categoryMain', moduleIds: ['dashboard', 'analytics'] },
  { labelKey: 'sidebar.categoryTrade', moduleIds: ['upload', 'reseller', 'buyer'] },
  { labelKey: 'sidebar.categoryAutomation', moduleIds: ['automation'] },
  { labelKey: 'sidebar.categoryFinance', moduleIds: ['finance'] },
  { labelKey: 'sidebar.categorySystem', moduleIds: ['tools', 'settings'] }
]

export function resolveSidebarCategories(
  core: LoadedModule[],
  optional: LoadedModule[],
  enabled: Record<string, boolean | undefined>
): Array<{ labelKey: TranslationKey; modules: LoadedModule[] }> {
  const byId = new Map([...core, ...optional].map((m) => [m.id, m]))

  return SIDEBAR_CATEGORIES.map(({ labelKey, moduleIds }) => ({
    labelKey,
    modules: moduleIds
      .map((id) => byId.get(id))
      .filter((m): m is LoadedModule => {
        if (!m) return false
        if (m.optional && enabled[m.id] === false) return false
        return true
      })
  })).filter((category) => category.modules.length > 0)
}
