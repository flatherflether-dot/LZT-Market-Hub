import {
  OPTIONAL_MODULES,
  CORE_MODULES,
  getDefaultModulesEnabled,
  getActivityModuleOrder,
  getModuleById
} from './module-loader'
import type {
  AnalyticsSectionId,
  DashboardWidgetId,
  LoadedModule,
  ModuleBridgeDefinition
} from './module-types'

export type { AnalyticsSectionId, DashboardWidgetId, LoadedModule, ModuleBridgeDefinition }
export { OPTIONAL_MODULES, CORE_MODULES, getModuleById, getActivityModuleOrder }

export type OptionalModuleId = string

export const MODULES_SETTING_KEY = 'modules_enabled'

export const MODULE_REGISTRY = OPTIONAL_MODULES
export const DEFAULT_MODULES_ENABLED = getDefaultModulesEnabled()

export const MODULE_BRIDGES: ModuleBridgeDefinition[] = [
  {
    id: 'competitor_tracking',
    requires: ['buyer', 'analytics'],
    descKey: 'modules.bridgeCompetitor'
  },
  {
    id: 'listing_reprice',
    requires: ['upload', 'automation'],
    descKey: 'modules.bridgeListingReprice'
  },
  {
    id: 'invoice_auto_deal',
    requires: ['finance', 'reseller'],
    descKey: 'modules.bridgeInvoiceDeal'
  }
]

const WIDGET_OWNERS = new Map<DashboardWidgetId, string>()
const SECTION_OWNERS = new Map<AnalyticsSectionId, string>()

for (const mod of OPTIONAL_MODULES) {
  for (const w of mod.dashboardWidgets ?? []) WIDGET_OWNERS.set(w, mod.id)
  for (const s of mod.analyticsSections ?? []) SECTION_OWNERS.set(s, mod.id)
}

export function parseModulesEnabled(raw: string | null | undefined): Record<string, boolean> {
  const defaults = getDefaultModulesEnabled()
  if (!raw) return { ...defaults }
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

export function serializeModulesEnabled(enabled: Record<string, boolean>): string {
  return JSON.stringify(enabled)
}

export function getModuleDefinition(id: string): LoadedModule | undefined {
  return getModuleById(id)
}

export function isBridgeActive(bridgeId: string, enabled: Record<string, boolean>): boolean {
  const bridge = MODULE_BRIDGES.find((b) => b.id === bridgeId)
  if (!bridge) return false
  return bridge.requires.every((mid) => enabled[mid] !== false)
}

export function isDashboardWidgetVisible(
  widgetId: DashboardWidgetId,
  enabled: Record<string, boolean>
): boolean {
  const owner = WIDGET_OWNERS.get(widgetId)
  if (!owner) return true
  return enabled[owner] !== false
}

export function isAnalyticsSectionVisible(
  sectionId: AnalyticsSectionId,
  enabled: Record<string, boolean>
): boolean {
  if (sectionId === 'buyer_competitors') {
    return isBridgeActive('competitor_tracking', enabled)
  }
  const owner = SECTION_OWNERS.get(sectionId)
  if (!owner) return true
  return enabled[owner] !== false
}

export function getEnabledOptionalModules(enabled: Record<string, boolean>): LoadedModule[] {
  return OPTIONAL_MODULES.filter((m) => enabled[m.id] !== false)
}

export function isActivityModuleVisible(moduleId: string, enabled: Record<string, boolean>): boolean {
  if (moduleId === 'tools' || moduleId === 'settings' || moduleId === 'dashboard') return true
  return enabled[moduleId] !== false
}

export function hasAnyOptionalModuleEnabled(enabled: Record<string, boolean>): boolean {
  return OPTIONAL_MODULES.some((m) => enabled[m.id] !== false)
}

export function filterActivityByModules<T extends { module: string }>(
  items: T[],
  enabled: Record<string, boolean>
): T[] {
  return items.filter((item) => isActivityModuleVisible(item.module, enabled))
}
