import { useEffect, useRef } from 'react'
import { useAutoRefreshEnabled, useAutoRefreshIntervalMs } from '@core/auto-refresh-store'

export function useAutoRefresh(
  callback: (silent: true) => void | Promise<void>,
  deps: readonly unknown[],
  intervalMs?: number,
  enabled = true
): void {
  const storeIntervalMs = useAutoRefreshIntervalMs()
  const storeEnabled = useAutoRefreshEnabled()
  const effectiveInterval = intervalMs ?? storeIntervalMs
  const effectiveEnabled = enabled && storeEnabled

  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!effectiveEnabled) return
    const timer = setInterval(() => {
      void callbackRef.current(true)
    }, effectiveInterval)
    return () => clearInterval(timer)
  }, [effectiveEnabled, effectiveInterval, ...deps])
}

export { AUTO_REFRESH_MS } from '@core/auto-refresh-store'
