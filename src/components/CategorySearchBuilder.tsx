import { useEffect, useState } from 'react'
import { Input, Select } from '@components/FormFields'
import { getApiClient } from '@core/api-client'
import type { CategoryGame, CategorySearchParam } from '@core/constants'
import { useTranslation } from '@core/i18n'

const PRIORITY_PARAMS = new Set([
  'rmin', 'rmax', 'lmin', 'lmax', 'inv_min', 'inv_max', 'inv_game',
  'gmin', 'gmax', 'no_vac', 'mafile', 'balance_min', 'balance_max',
  'recently_hours_min', 'csgo_profile_rank_min', 'friend_min', 'win_count_min'
])

interface CategorySearchBuilderProps {
  category: string
  value: Record<string, string | number | boolean>
  onChange: (next: Record<string, string | number | boolean>) => void
  compact?: boolean
}

function isBooleanParam(param: CategorySearchParam): boolean {
  if (param.input?.includes('checkbox')) return true
  return ['no_vac', 'mm_ban', 'mafile'].includes(param.name)
}

function isNumericParam(name: string): boolean {
  return /_(min|max)$/.test(name) || ['reg', 'lmin', 'lmax', 'rmin', 'rmax', 'pmin', 'pmax'].includes(name)
}

export function CategorySearchBuilder({
  category,
  value,
  onChange,
  compact = false
}: CategorySearchBuilderProps): React.ReactNode {
  const { t } = useTranslation()
  const [params, setParams] = useState<CategorySearchParam[]>([])
  const [games, setGames] = useState<CategoryGame[]>([])
  const [expanded, setExpanded] = useState(!compact)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    void Promise.all([
      getApiClient().getCategoryParams(category).then(({ data }) => setParams(data.params ?? [])),
      getApiClient().getCategoryGames(category).then(({ data }) => setGames(data.games ?? [])).catch(() => setGames([]))
    ])
      .catch(() => setParams([]))
      .finally(() => setLoading(false))
  }, [category])

  function setField(name: string, raw: string | boolean): void {
    const next = { ...value }
    if (raw === '' || raw === false) {
      delete next[name]
    } else if (typeof raw === 'boolean') {
      next[name] = raw ? 1 : 0
    } else if (isNumericParam(name)) {
      const n = Number(raw)
      if (Number.isFinite(n)) next[name] = n
      else delete next[name]
    } else {
      next[name] = raw
    }
    onChange(next)
  }

  const visible = expanded
    ? params
    : params.filter((p) => PRIORITY_PARAMS.has(p.name.replace(/\[\]$/, '')))

  return (
    <div className="category-search-builder">
      <div className="form-toolbar">
        <span className="form-hint">{loading ? '…' : t('categorySearch.paramsLoaded', { count: params.length })}</span>
        {compact && params.length > visible.length && (
          <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)}>
            {expanded ? t('categorySearch.showLess') : t('categorySearch.showAll')}
          </button>
        )}
      </div>
      {visible.map((param) => {
        const name = param.name.replace(/\[\]$/, '')
        const current = value[name]

        if (name === 'inv_game' && games.length > 0) {
          return (
            <Select
              key={param.name}
              label={param.description || name}
              value={current !== undefined ? String(current) : ''}
              onChange={(e) => setField(name, e.target.value)}
              options={[
                { value: '', label: '—' },
                ...games.map((g) => ({ value: g.app_id, label: g.title }))
              ]}
            />
          )
        }

        if (param.values && param.values.length > 0) {
          return (
            <Select
              key={param.name}
              label={param.description || name}
              value={current !== undefined ? String(current) : ''}
              onChange={(e) => setField(name, e.target.value)}
              options={[
                { value: '', label: '—' },
                ...param.values.map((v) => ({ value: v, label: v }))
              ]}
            />
          )
        }

        if (isBooleanParam(param)) {
          return (
            <label key={param.name} className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(current)}
                onChange={(e) => setField(name, e.target.checked)}
              />
              {param.description || name}
            </label>
          )
        }

        return (
          <Input
            key={param.name}
            label={param.description || name}
            type={isNumericParam(name) ? 'number' : 'text'}
            value={current !== undefined ? String(current) : ''}
            onChange={(e) => setField(name, e.target.value)}
          />
        )
      })}
    </div>
  )
}
