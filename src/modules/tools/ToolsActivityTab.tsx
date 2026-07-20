import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutDashboard,
  Search,
  Settings,
  ShoppingCart,
  Upload,
  Users,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { Button } from '@components/Button'
import type { ActivityLogEntry } from '@renderer/types/database'
import {
  formatActivityAction,
  formatActivityModule,
  sortActivityModules
} from '@core/activity-i18n'
import { downloadCsv, toCsv } from '@core/export-csv'
import { useTranslation } from '@core/i18n'

const MODULE_ICONS: Record<string, LucideIcon> = {
  upload: Upload,
  buyer: ShoppingCart,
  reseller: Users,
  automation: Zap,
  finance: Wallet,
  tools: Wrench,
  settings: Settings,
  analytics: BarChart3,
  dashboard: LayoutDashboard
}

const ACTIVITY_PAGE_SIZES = [10, 25, 50, 100] as const

export interface ToolsActivityTabProps {
  activity: ActivityLogEntry[]
  hasAnyModule: boolean
}

export function ToolsActivityTab(props: ToolsActivityTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const activityModules = useMemo(
    () => sortActivityModules([...new Set(props.activity.map((entry) => entry.module))]),
    [props.activity]
  )

  const moduleCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of props.activity) {
      counts.set(entry.module, (counts.get(entry.module) ?? 0) + 1)
    }
    return counts
  }, [props.activity])

  const moduleFiltered = useMemo(() => {
    if (moduleFilter === 'all') return props.activity
    return props.activity.filter((entry) => entry.module === moduleFilter)
  }, [props.activity, moduleFilter])

  const actionOptions = useMemo(() => {
    const actions = new Set(moduleFiltered.map((entry) => entry.action))
    return [...actions].sort((a, b) => formatActivityAction(t, a).localeCompare(formatActivityAction(t, b)))
  }, [moduleFiltered, t])

  const actionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of moduleFiltered) {
      counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1)
    }
    return counts
  }, [moduleFiltered])

  const filteredActivity = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return moduleFiltered.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false
      if (!query) return true
      const haystack = [
        entry.module,
        entry.action,
        entry.details ?? '',
        formatActivityModule(t, entry.module),
        formatActivityAction(t, entry.action)
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [moduleFiltered, actionFilter, searchQuery, t])

  const totalPages = Math.max(1, Math.ceil(filteredActivity.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [moduleFilter, actionFilter, searchQuery, pageSize])

  useEffect(() => {
    setActionFilter('all')
  }, [moduleFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedActivity = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredActivity.slice(start, start + pageSize)
  }, [filteredActivity, safePage, pageSize])

  const moduleTabs = [
    { id: 'all', label: t('tools.filterAllModules'), count: props.activity.length },
    ...activityModules.map((module) => ({
      id: module,
      label: formatActivityModule(t, module),
      count: moduleCounts.get(module) ?? 0
    }))
  ]

  function exportActivity(): void {
    downloadCsv(
      'activity-log.csv',
      toCsv(filteredActivity as unknown as Record<string, unknown>[], [
        'module',
        'action',
        'details',
        'created_at'
      ])
    )
  }

  return (
    <div className="tools-hub tools-activity-hub">
      <section className="tools-section tools-activity-card">
        <header className="tools-section-head">
          <div className="tools-section-head-main">
            <div className="tools-section-head-icon">
              <Activity size={18} />
            </div>
            <div>
              <h3>{t('tools.activityLog')}</h3>
              <p>{t('tools.activityDesc')}</p>
            </div>
          </div>
          <div className="tools-section-toolbar">
            <span className="tools-count-badge">{filteredActivity.length}</span>
            <Button
              size="sm"
              variant="secondary"
              className="tools-toolbar-btn"
              onClick={exportActivity}
              disabled={!filteredActivity.length}
            >
              <Download size={14} />
              {t('common.downloadCsv')}
            </Button>
          </div>
        </header>

        <div className="tools-section-body tools-activity-body">
          {props.activity.length > 0 && (
            <>
              <div className="tools-activity-tabs-wrap">
                <div className="tools-activity-tabs" role="tablist" aria-label={t('tools.activityModules')}>
                  {moduleTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={moduleFilter === tab.id}
                      className={clsx('tools-activity-tab', moduleFilter === tab.id && 'is-active')}
                      onClick={() => setModuleFilter(tab.id)}
                    >
                      <span className="tools-activity-tab-label">{tab.label}</span>
                      <span className="tools-activity-tab-count">{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="tools-activity-filters-bar">
                <label className="tools-activity-search">
                  <Search size={14} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('tools.activitySearchPlaceholder')}
                  />
                </label>

                {actionOptions.length > 1 && (
                  <div className="tools-activity-action-filters">
                    <span className="tools-activity-action-label">{t('tools.activityFilterActions')}</span>
                    <div className="tools-activity-action-tabs">
                      <button
                        type="button"
                        className={clsx('tools-activity-action-tab', actionFilter === 'all' && 'is-active')}
                        onClick={() => setActionFilter('all')}
                      >
                        {t('tools.filterAllActions')}
                        <span>{moduleFiltered.length}</span>
                      </button>
                      {actionOptions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={clsx('tools-activity-action-tab', actionFilter === action && 'is-active')}
                          onClick={() => setActionFilter(action)}
                        >
                          {formatActivityAction(t, action)}
                          <span>{actionCounts.get(action) ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {filteredActivity.length === 0 ? (
            <div className="tools-empty">
              <Activity size={36} />
              <p>{props.hasAnyModule ? t('tools.noActivity') : t('dashboard.noModuleActivity')}</p>
            </div>
          ) : (
            <>
              <div className="tools-activity-table-head" aria-hidden="true">
                <span>{t('tools.activityColModule')}</span>
                <span>{t('tools.activityColAction')}</span>
                <span>{t('tools.activityColDetails')}</span>
                <span>{t('tools.activityColDate')}</span>
              </div>

              <div className="tools-activity-list">
                {paginatedActivity.map((entry) => {
                  const Icon = MODULE_ICONS[entry.module] ?? Activity
                  return (
                    <article key={entry.id} className={clsx('tools-activity-row', `mod-${entry.module}`)}>
                      <div className="tools-activity-icon">
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      <span className="tools-activity-module">{formatActivityModule(t, entry.module)}</span>
                      <span className="tools-activity-action">{formatActivityAction(t, entry.action)}</span>
                      <p className="tools-activity-details">{entry.details?.trim() || '—'}</p>
                      <time className="tools-activity-time" dateTime={entry.created_at}>
                        <Clock size={12} />
                        {new Date(entry.created_at).toLocaleString()}
                      </time>
                    </article>
                  )
                })}
              </div>

              <footer className="tools-activity-footer">
                <div className="tools-activity-pages">
                  <button
                    type="button"
                    className="tools-activity-page-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={t('common.prevPage')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="tools-activity-page-label">
                    {t('reseller.journalPageOf', { page: safePage, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    className="tools-activity-page-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label={t('common.nextPage')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="tools-activity-per-page">
                  <span className="tools-activity-per-page-label">{t('reseller.journalPerPage')}</span>
                  <div className="tools-activity-per-page-options" role="group" aria-label={t('reseller.journalPerPage')}>
                    {ACTIVITY_PAGE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={clsx('tools-activity-per-page-btn', pageSize === size && 'is-active')}
                        onClick={() => setPageSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
