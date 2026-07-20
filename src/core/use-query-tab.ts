import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useQueryTab<T extends string>(
  param: string,
  defaultValue: T,
  validValues: readonly T[]
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = useMemo(() => {
    const raw = searchParams.get(param)
    if (raw && validValues.includes(raw as T)) return raw as T
    return defaultValue
  }, [searchParams, param, defaultValue, validValues])

  const setValue = useCallback(
    (next: T) => {
      const nextParams = new URLSearchParams(searchParams)
      if (next === defaultValue) nextParams.delete(param)
      else nextParams.set(param, next)
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams, param, defaultValue]
  )

  return [value, setValue]
}
