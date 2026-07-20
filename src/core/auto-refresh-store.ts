import { create } from 'zustand'

export const AUTO_REFRESH_INTERVAL_MIN = 15
export const AUTO_REFRESH_INTERVAL_MAX = 600
export const AUTO_REFRESH_INTERVAL_DEFAULT = 60
export const AUTO_REFRESH_INTERVAL_PRESETS = [30, 60, 120, 300] as const

export const AUTO_REFRESH_INTERVAL_KEY = 'auto_refresh_interval_seconds'
export const AUTO_REFRESH_ENABLED_KEY = 'auto_refresh_enabled'

export const AUTO_REFRESH_MS = AUTO_REFRESH_INTERVAL_DEFAULT * 1000

export function clampAutoRefreshInterval(value: number): number {
  return Math.min(AUTO_REFRESH_INTERVAL_MAX, Math.max(AUTO_REFRESH_INTERVAL_MIN, value))
}

interface AutoRefreshState {
  intervalSeconds: number
  enabled: boolean
  hydrated: boolean
  hydrate: () => Promise<void>
  setIntervalSeconds: (seconds: number) => void
  setEnabled: (enabled: boolean) => void
  save: () => Promise<void>
}

export const useAutoRefreshStore = create<AutoRefreshState>((set, get) => ({
  intervalSeconds: AUTO_REFRESH_INTERVAL_DEFAULT,
  enabled: true,
  hydrated: false,

  hydrate: async () => {
    const [intervalRaw, enabledRaw] = await Promise.all([
      window.api.db.getSetting(AUTO_REFRESH_INTERVAL_KEY),
      window.api.db.getSetting(AUTO_REFRESH_ENABLED_KEY)
    ])
    const intervalSeconds = clampAutoRefreshInterval(Number(intervalRaw) || AUTO_REFRESH_INTERVAL_DEFAULT)
    const enabled = enabledRaw !== '0'
    set({ intervalSeconds, enabled, hydrated: true })
  },

  setIntervalSeconds: (seconds) => {
    set({ intervalSeconds: clampAutoRefreshInterval(seconds) })
  },

  setEnabled: (enabled) => {
    set({ enabled })
  },

  save: async () => {
    const { intervalSeconds, enabled } = get()
    const clamped = clampAutoRefreshInterval(intervalSeconds)
    await Promise.all([
      window.api.db.setSetting(AUTO_REFRESH_INTERVAL_KEY, String(clamped)),
      window.api.db.setSetting(AUTO_REFRESH_ENABLED_KEY, enabled ? '1' : '0')
    ])
    set({ intervalSeconds: clamped })
  }
}))

export function useAutoRefreshIntervalMs(): number {
  return useAutoRefreshStore((s) => s.intervalSeconds * 1000)
}

export function useAutoRefreshEnabled(): boolean {
  return useAutoRefreshStore((s) => s.enabled)
}
