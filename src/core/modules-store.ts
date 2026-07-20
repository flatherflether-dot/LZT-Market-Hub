import { create } from 'zustand'
import { getDefaultModulesEnabled } from './module-loader'
import {
  MODULES_SETTING_KEY,
  parseModulesEnabled,
  serializeModulesEnabled,
  isBridgeActive,
  isDashboardWidgetVisible,
  isAnalyticsSectionVisible,
  getEnabledOptionalModules,
  hasAnyOptionalModuleEnabled,
  filterActivityByModules,
  type DashboardWidgetId,
  type AnalyticsSectionId
} from './module-registry'

interface ModulesState {
  enabled: Record<string, boolean>
  hydrated: boolean
  hydrate: () => Promise<void>
  setEnabled: (id: string, value: boolean) => Promise<void>
  applyConfig: (next: Record<string, boolean>) => Promise<void>
}

export const useModulesStore = create<ModulesState>((set, get) => ({
  enabled: { ...getDefaultModulesEnabled() },
  hydrated: false,

  hydrate: async () => {
    const raw = await window.api.db.getSetting(MODULES_SETTING_KEY)
    set({ enabled: parseModulesEnabled(raw), hydrated: true })
  },

  applyConfig: async (next) => {
    await window.api.modules.apply(next)
    await window.api.db.setSetting(MODULES_SETTING_KEY, serializeModulesEnabled(next))
    set({ enabled: next })
  },

  setEnabled: async (id, value) => {
    await get().applyConfig({ ...get().enabled, [id]: value })
  }
}))

export function useModuleEnabled(id: string): boolean {
  return useModulesStore((s) => s.enabled[id] !== false)
}

export function useModulesHelpers() {
  const enabled = useModulesStore((s) => s.enabled)
  return {
    enabled,
    isEnabled: (id: string) => enabled[id] !== false,
    isBridgeActive: (bridgeId: string) => isBridgeActive(bridgeId, enabled),
    isWidgetVisible: (widgetId: DashboardWidgetId) => isDashboardWidgetVisible(widgetId, enabled),
    isAnalyticsVisible: (sectionId: AnalyticsSectionId) => isAnalyticsSectionVisible(sectionId, enabled),
    enabledModules: getEnabledOptionalModules(enabled),
    hasAnyModule: hasAnyOptionalModuleEnabled(enabled),
    filterActivity: <T extends { module: string }>(items: T[]) => filterActivityByModules(items, enabled)
  }
}
