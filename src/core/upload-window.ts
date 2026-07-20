export interface UploadWindowConfig {
  enabled: boolean
  startHour: number
  endHour: number
}

export function parseUploadWindow(
  enabledRaw: string | null,
  startRaw: string | null,
  endRaw: string | null
): UploadWindowConfig {
  return {
    enabled: enabledRaw === '1',
    startHour: Math.min(23, Math.max(0, Number(startRaw) || 9)),
    endHour: Math.min(23, Math.max(0, Number(endRaw) || 22))
  }
}

export function isWithinUploadWindow(config: UploadWindowConfig, date = new Date()): boolean {
  if (!config.enabled) return true
  const hour = date.getHours()
  const { startHour, endHour } = config
  if (startHour <= endHour) return hour >= startHour && hour <= endHour
  return hour >= startHour || hour <= endHour
}

export function msUntilUploadWindow(config: UploadWindowConfig, date = new Date()): number {
  if (!config.enabled || isWithinUploadWindow(config, date)) return 0
  const next = new Date(date)
  next.setMinutes(0, 0, 0)
  if (date.getHours() < config.startHour) {
    next.setHours(config.startHour)
  } else {
    next.setDate(next.getDate() + 1)
    next.setHours(config.startHour)
  }
  return Math.max(0, next.getTime() - date.getTime())
}
