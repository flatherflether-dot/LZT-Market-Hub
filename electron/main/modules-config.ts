import { getDatabase, getSetting } from './database'

export const MODULES_SETTING_KEY = 'modules_enabled'

const FALLBACK_DEFAULTS: Record<string, boolean> = {
  upload: true,
  reseller: true,
  buyer: true,
  automation: true,
  analytics: true,
  finance: true
}

export function parseModulesEnabled(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return { ...FALLBACK_DEFAULTS }
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return { ...FALLBACK_DEFAULTS, ...parsed }
  } catch {
    return { ...FALLBACK_DEFAULTS }
  }
}

export function getModulesEnabled(): Record<string, boolean> {
  return parseModulesEnabled(getSetting(MODULES_SETTING_KEY))
}

export function isModuleEnabled(id: string): boolean {
  return getModulesEnabled()[id] !== false
}

export function isBridgeActive(requires: string[]): boolean {
  const enabled = getModulesEnabled()
  return requires.every((id) => enabled[id] !== false)
}

export function saveModulesEnabled(config: Record<string, boolean>): void {
  getDatabase()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(MODULES_SETTING_KEY, JSON.stringify(config))
}
