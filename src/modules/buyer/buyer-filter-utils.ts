import type { WatchFilter } from '@renderer/types/database'
import type { TranslationKey } from '@core/i18n'

const PARAM_ORDER = ['pmin', 'pmax']

export function sortFilterParams(params: Array<[string, string]>): Array<[string, string]> {
  return [...params].sort((a, b) => {
    const ai = PARAM_ORDER.indexOf(a[0])
    const bi = PARAM_ORDER.indexOf(b[0])
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a[0].localeCompare(b[0])
  })
}

export function filterParamLabel(
  key: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  if (key === 'pmin') return t('buyer.minPrice')
  if (key === 'pmax') return t('buyer.maxPrice')
  return key
}

export function parseFilterParams(json: string): Array<[string, string]> {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    return Object.entries(parsed)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => [key, String(value)])
  } catch {
    return [['params', json]]
  }
}

export function filterParamsToForm(paramsJson: string): {
  pmin: string
  pmax: string
  extraParams: Record<string, string | number | boolean>
} {
  try {
    const parsed = JSON.parse(paramsJson) as Record<string, string | number | boolean>
    const { pmin, pmax, ...rest } = parsed
    return {
      pmin: pmin != null ? String(pmin) : '',
      pmax: pmax != null ? String(pmax) : '',
      extraParams: rest
    }
  } catch {
    return { pmin: '', pmax: '', extraParams: {} }
  }
}

export function buildFilterParamsJson(
  pmin: string,
  pmax: string,
  extraParams: Record<string, string | number | boolean>
): string {
  return JSON.stringify({
    pmax: Number(pmax) || undefined,
    pmin: Number(pmin) || undefined,
    ...extraParams
  })
}

export function resolvePreviewFilter(
  filters: WatchFilter[],
  activeFilterId: number | null,
  fallback: { category: string; params_json: string }
): WatchFilter | { category: string; params_json: string } {
  if (activeFilterId) {
    const selected = filters.find((f) => f.id === activeFilterId)
    if (selected) return selected
  }
  const enabled = filters.filter((f) => f.is_enabled)
  if (enabled.length > 0) return enabled[0]
  if (filters.length > 0) return filters[0]
  return fallback
}
