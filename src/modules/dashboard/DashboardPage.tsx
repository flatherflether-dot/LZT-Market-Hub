import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import {
  Upload,
  Zap,
  BarChart3,
  Wallet,
  CircleDollarSign,
  TrendingUp,
  Package,
  Radio,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Puzzle,
  ArrowUpRight,
  ListChecks
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@components/Card'
import { Button } from '@components/Button'
import { MoneyValue } from '@components/MoneyValue'
import { PageLayout } from '@components/PageLayout'
import { DonutChart, RevenueLineChart, type DonutSegment } from '@components/Charts'
import { useAuthStore } from '@core/auth-store'
import { useTranslation } from '@core/i18n'
import { useModulesHelpers, useModulesStore } from '@core/modules-store'
import { formatRub, formatRubCompact } from '@core/market-utils'
import { useUiStore } from '@core/ui-store'
import { isUploadHistorySuccess, isUploadHistoryFailure } from '@core/upload-status'
import type {
  ActivityLogEntry,
  DashboardStats,
  Deal,
  ImapConfigEntry,
  RateLimitInfo,
  UploadHistoryEntry
} from '@renderer/types/database'
import { DashboardIntegrationCards } from '@modules/dashboard/DashboardIntegrationCards'
import { useAutoRefresh } from '@core/use-auto-refresh'

interface DashboardData {
  stats: DashboardStats
  uploads: UploadHistoryEntry[]
  deals: Deal[]
  listingCount: number
  autobuyToday: number
  rateLimit: RateLimitInfo | null
  activityLog: ActivityLogEntry[]
  imapConfigs: ImapConfigEntry[]
  telegramConfigured: boolean
}

interface DashGaugeItem {
  key: string
  icon: LucideIcon
  label: string
  value: ReactNode
  barPct: number
  barClass?: string
  hint: string
  valueClass?: string
  accent?: boolean
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (n / total) * 100))
}

function buildDailySeries<T extends { created_at: string }>(
  items: T[],
  reducer: (bucket: T[]) => number,
  days = 14
): Array<{ label: string; value: number }> {
  const now = new Date()
  const buckets = new Map<string, T[]>()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    buckets.set(d.toISOString().slice(0, 10), [])
  }

  for (const item of items) {
    const key = item.created_at.slice(0, 10)
    if (buckets.has(key)) buckets.get(key)!.push(item)
  }

  return [...buckets.entries()].map(([key, bucket]) => ({
    label: new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: reducer(bucket)
  }))
}

export function DashboardPage(): React.ReactNode {
  const { t } = useTranslation()
  const { isWidgetVisible, hasAnyModule, filterActivity, isEnabled } = useModulesHelpers()
  const uploadEnabled = isEnabled('upload')
  const buyerEnabled = isEnabled('buyer')
  const token = useAuthStore((s) => s.token)
  const profile = useAuthStore((s) => s.profile)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const openAuthModal = useUiStore((s) => s.openAuthModal)

  const enabled = useModulesStore((s) => s.enabled)
  const [data, setData] = useState<DashboardData | null>(null)

  const loadData = useCallback(async (): Promise<void> => {
    const moduleOn = (id: string) => enabled[id] !== false
    const [stats, uploads, deals, listingCount, autobuyToday, rateLimit, activityLog, imapConfigs, botToken, chatId] =
      await Promise.all([
        window.api.db.getDashboardStats(),
        moduleOn('upload') ? window.api.db.getUploadHistory() : Promise.resolve([] as UploadHistoryEntry[]),
        moduleOn('reseller') ? window.api.db.getDeals() : Promise.resolve([] as Deal[]),
        moduleOn('buyer') ? window.api.db.getListingCount() : Promise.resolve(0),
        moduleOn('buyer') ? window.api.db.getAutobuyCountToday() : Promise.resolve(0),
        token ? window.api.market.getRateLimit().catch(() => null) : Promise.resolve(null),
        window.api.db.getActivityLog(200),
        moduleOn('upload') ? window.api.db.getImapConfigs() : Promise.resolve([] as ImapConfigEntry[]),
        window.api.db.getSetting('telegram_bot_token'),
        window.api.db.getSetting('telegram_chat_id')
      ])
    setData({
      stats,
      uploads,
      deals,
      listingCount,
      autobuyToday,
      rateLimit,
      activityLog,
      imapConfigs,
      telegramConfigured: Boolean(botToken?.trim() && chatId?.trim())
    })
  }, [token, enabled])

  const runRefresh = useCallback(async (): Promise<void> => {
    await Promise.all([loadData(), token ? fetchProfile() : Promise.resolve()])
  }, [loadData, token, fetchProfile])

  useEffect(() => {
    void runRefresh()
  }, [runRefresh])

  useAutoRefresh(() => runRefresh(), [runRefresh])

  const available = Math.max(0, (profile?.balance ?? 0) - (profile?.hold ?? 0))
  const holdPct = pct(profile?.hold ?? 0, profile?.balance ?? 0)
  const availablePct = pct(available, profile?.balance ?? 0)

  const visibleActivity = useMemo(
    () => filterActivity(data?.activityLog ?? []),
    [data?.activityLog, filterActivity]
  )

  const uploadSuccessCount = useMemo(
    () => (data?.uploads ?? []).filter((u) => isUploadHistorySuccess(u.status)).length,
    [data?.uploads]
  )
  const uploadFailCount = useMemo(
    () => (data?.uploads ?? []).filter((u) => isUploadHistoryFailure(u.status)).length,
    [data?.uploads]
  )
  const uploadSuccessPct = pct(uploadSuccessCount, data?.uploads.length ?? 0)
  const rateLimitPct = data?.rateLimit ? pct(data.rateLimit.remaining, data.rateLimit.limit) : 0

  const avgMargin = useMemo(() => {
    const deals = data?.deals ?? []
    if (deals.length === 0) return 0
    return deals.reduce((s, d) => s + (d.margin ?? 0), 0) / deals.length
  }, [data?.deals])

  const uploadTimeline = useMemo(
    () => buildDailySeries(data?.uploads ?? [], (bucket) => bucket.length, 14),
    [data?.uploads]
  )

  const recentDeals = useMemo(
    () =>
      [...(data?.deals ?? [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
    [data?.deals]
  )

  const recentUploads = useMemo(
    () =>
      [...(data?.uploads ?? [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
    [data?.uploads]
  )

  const marginSplit = useMemo(() => {
    let profit = 0
    let loss = 0
    for (const deal of data?.deals ?? []) {
      const margin = deal.margin ?? 0
      if (margin >= 0) profit += margin
      else loss += Math.abs(margin)
    }
    const total = profit + loss
    return {
      profit,
      loss,
      profitPct: pct(profit, total),
      net: profit - loss
    }
  }, [data?.deals])

  const financeDonut = useMemo(() => {
    const showBalance = isWidgetVisible('finance_balance') && !!token
    const showMargin = isWidgetVisible('reseller_margin')
    const segments: DonutSegment[] = []

    if (showBalance) {
      if (available > 0) {
        segments.push({ label: t('finance.available'), value: available, color: '#00ba78' })
      }
      const hold = profile?.hold ?? 0
      if (hold > 0) {
        segments.push({ label: t('finance.hold'), value: hold, color: '#e8a020' })
      }
    }

    if (showMargin) {
      if (marginSplit.profit > 0) {
        segments.push({
          label: t('dashboard.marginProfit'),
          value: marginSplit.profit,
          color: '#5b9cf6',
          legendOnly: true
        })
      }
      if (marginSplit.loss > 0) {
        segments.push({
          label: t('dashboard.marginLoss'),
          value: marginSplit.loss,
          color: '#e05252',
          legendOnly: true
        })
      }
    }

    if (showBalance) {
      return {
        segments,
        centerLabel: t('finance.available'),
        centerValue: `${availablePct.toFixed(0)}%`
      }
    }

    if (showMargin) {
      return {
        segments,
        centerLabel: t('dashboard.totalMargin'),
        centerValue: formatRubCompact(marginSplit.net)
      }
    }

    return { segments, centerLabel: '', centerValue: '' }
  }, [
    isWidgetVisible,
    token,
    available,
    availablePct,
    profile?.hold,
    marginSplit,
    t
  ])

  const alerts = useMemo(() => {
    if (!token || !data) return []
    const list: Array<{ key: string; tone: 'warn' | 'info'; text: string }> = []
    if (isWidgetVisible('alert_hold') && (profile?.hold ?? 0) > 0 && holdPct >= 15) {
      list.push({ key: 'hold', tone: 'warn', text: t('dashboard.alertHold', { pct: holdPct.toFixed(0) }) })
    }
    if (data.rateLimit && rateLimitPct <= 20) {
      list.push({ key: 'rate', tone: 'warn', text: t('dashboard.alertRateLimit', { remaining: data.rateLimit.remaining }) })
    }
    if (
      isWidgetVisible('alert_upload') &&
      uploadSuccessPct > 0 &&
      uploadSuccessPct < 70 &&
      (data.uploads.length ?? 0) >= 3
    ) {
      list.push({ key: 'upload', tone: 'info', text: t('dashboard.alertUploadRate', { pct: uploadSuccessPct.toFixed(0) }) })
    }
    return list
  }, [token, data, profile?.hold, holdPct, rateLimitPct, uploadSuccessPct, t, isWidgetVisible])

  const showFinanceOverview =
    (isWidgetVisible('finance_balance') && !!token) || isWidgetVisible('reseller_margin')

  const showDonutCharts =
    showFinanceOverview ||
    (isWidgetVisible('upload_success') && (data?.uploads.length ?? 0) > 0)

  const showCharts = showDonutCharts || isWidgetVisible('chart_upload_timeline')

  const kpiGauges = useMemo(() => {
    if (!data) return [] as DashGaugeItem[]

    const items: DashGaugeItem[] = []

    const activeItems = profile?.activeItems ?? 0
    const soldItems = profile?.soldItems ?? 0
    const totalMargin = data.stats.totalMargin ?? 0

    items.push({
      key: 'active',
      icon: Package,
      label: t('dashboard.activeListings'),
      value: profile?.activeItems ?? '—',
      barPct: Math.min(100, activeItems * 8),
      hint: `${t('dashboard.soldListings')}: ${soldItems}`
    })

    if (isWidgetVisible('reseller_margin')) {
      items.push({
        key: 'margin',
        icon: TrendingUp,
        label: t('dashboard.totalMargin'),
        value: formatRubCompact(totalMargin),
        barPct: Math.min(100, Math.abs(totalMargin) / Math.max(1, data.stats.dealsCount * 150) * 100),
        hint: t('dashboard.dealsCount', { count: data.stats.dealsCount ?? 0 }),
        valueClass: totalMargin >= 0 ? 'text-success' : 'text-danger',
        accent: totalMargin >= 0
      })
    }

    if (isWidgetVisible('reseller_margin') && data.deals.length > 0) {
      items.push({
        key: 'avg-margin',
        icon: BarChart3,
        label: t('analytics.avgMargin'),
        value: formatRubCompact(avgMargin),
        barPct: Math.min(100, Math.abs(avgMargin) / Math.max(1, Math.abs(totalMargin)) * 100),
        hint: t('dashboard.dealsCount', { count: data.deals.length }),
        valueClass: avgMargin >= 0 ? 'text-success' : 'text-danger'
      })
    }

    if (isWidgetVisible('upload_success')) {
      items.push({
        key: 'upload',
        icon: Upload,
        label: t('dashboard.uploadSuccess'),
        value: `${uploadSuccessPct.toFixed(0)}%`,
        barPct: uploadSuccessPct,
        hint: t('dashboard.uploadSuccessHint', { ok: uploadSuccessCount, total: data.uploads.length ?? 0 })
      })
    }

    if (isWidgetVisible('buyer_autobuy')) {
      items.push({
        key: 'autobuy',
        icon: Zap,
        label: t('dashboard.autobuyToday'),
        value: data.autobuyToday ?? 0,
        barPct: Math.min(100, (data.autobuyToday ?? 0) * 25),
        hint: t('dashboard.listingsTracked', { count: data.listingCount ?? 0 })
      })
    }

    if (isWidgetVisible('finance_hold') && !isWidgetVisible('finance_balance')) {
      items.push({
        key: 'hold',
        icon: Activity,
        label: t('finance.hold'),
        value: <MoneyValue value={profile?.hold ?? 0} className="dash-gauge-value-sm" />,
        barPct: holdPct,
        barClass: 'dash-gauge-bar-hold',
        hint: t('dashboard.holdShare', { pct: holdPct.toFixed(0) })
      })
    }

    if (isWidgetVisible('automation_pipeline')) {
      items.push({
        key: 'pipeline',
        icon: ListChecks,
        label: t('dashboard.pipelineTitle'),
        value: data.stats.tasksCount ?? 0,
        barPct: Math.min(100, (data.stats.tasksCount ?? 0) * 20),
        hint: t('dashboard.pipelineTasks')
      })
    }

    return items
  }, [
    data,
    profile?.activeItems,
    profile?.soldItems,
    profile?.hold,
    avgMargin,
    uploadSuccessPct,
    uploadSuccessCount,
    holdPct,
    t,
    isWidgetVisible
  ])

  const balanceGauges = useMemo((): DashGaugeItem[] => {
    if (!isWidgetVisible('finance_balance')) return []

    return [
      {
        key: 'balance',
        icon: Wallet,
        label: t('finance.balance'),
        value: <MoneyValue value={profile?.balance ?? 0} className="dash-gauge-value-sm" />,
        barPct: availablePct,
        hint: t('dashboard.availableShare', { pct: availablePct.toFixed(0) }),
        accent: true
      },
      {
        key: 'available',
        icon: CircleDollarSign,
        label: t('finance.available'),
        value: <MoneyValue value={available} className="dash-gauge-value-sm" />,
        barPct: availablePct,
        hint: t('dashboard.availableShare', { pct: availablePct.toFixed(0) })
      },
      {
        key: 'hold',
        icon: Activity,
        label: t('finance.hold'),
        value: <MoneyValue value={profile?.hold ?? 0} className="dash-gauge-value-sm" />,
        barPct: holdPct,
        barClass: 'dash-gauge-bar-hold',
        hint: t('dashboard.holdShare', { pct: holdPct.toFixed(0) })
      }
    ]
  }, [
    isWidgetVisible,
    profile?.balance,
    profile?.hold,
    available,
    availablePct,
    holdPct,
    t
  ])

  const allGauges = useMemo(
    () => [...balanceGauges, ...kpiGauges],
    [balanceGauges, kpiGauges]
  )

  const main = !token ? (
    <Card title={t('dashboard.welcomeTitle')} className="card-main dashboard-welcome-card">
      <p className="dashboard-welcome-text">{t('dashboard.authorizeHint')}</p>
      <div className="dash-preview-grid">
        {[Wallet, TrendingUp, Package, Radio].map((Icon, i) => (
          <div key={i} className="dash-preview-tile">
            <Icon size={20} />
            <span>—</span>
          </div>
        ))}
      </div>
      <Button onClick={() => openAuthModal()}>{t('layout.authorize')}</Button>
    </Card>
  ) : (
    <div className="dashboard-main-stack">
      {!hasAnyModule && (
        <Card title={t('dashboard.allModulesOff')} className="card-main dashboard-modules-off-card">
          <p className="dashboard-welcome-text">{t('dashboard.allModulesOffHint')}</p>
          <NavLink to="/settings" className="button primary dashboard-modules-off-link">
            <Puzzle size={14} /> {t('dashboard.openModulesSettings')}
          </NavLink>
        </Card>
      )}

      {hasAnyModule && allGauges.length > 0 && (
        <div className="dash-gauge-grid dash-kpi-grid is-cols-3">
          {allGauges.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.key} className={clsx('dash-gauge', kpi.accent && 'dash-gauge-accent')}>
                <div className="dash-gauge-head">
                  <Icon size={16} />
                  <span>{kpi.label}</span>
                </div>
                {typeof kpi.value === 'string' || typeof kpi.value === 'number' ? (
                  <span className={clsx('dash-gauge-value', kpi.valueClass)}>{kpi.value}</span>
                ) : (
                  <div className={clsx('dash-gauge-value', kpi.valueClass)}>{kpi.value}</div>
                )}
                <div className="dash-gauge-bar">
                  <div
                    className={clsx('dash-gauge-bar-fill', kpi.barClass)}
                    style={{ width: `${kpi.barPct}%` }}
                  />
                </div>
                <span className="dash-gauge-hint">{kpi.hint}</span>
              </div>
            )
          })}
        </div>
      )}

      {hasAnyModule && (
        <div
          className={clsx(
            'dash-ops-row',
            !isWidgetVisible('automation_pipeline') && 'is-cols-1'
          )}
        >
          <div className="dash-ops-card">
            <div className="dash-ops-card-head">
              <BarChart3 size={18} />
              <span>{t('dashboard.rateLimit')}</span>
            </div>
            <span className="dash-ops-status">
              {data?.rateLimit
                ? `${data.rateLimit.remaining}/${data.rateLimit.limit}`
                : t('dashboard.rateLimitOff')}
            </span>
            <div className="dash-gauge-bar dash-ops-bar">
              <div
                className={clsx(
                  'dash-gauge-bar-fill',
                  rateLimitPct <= 20 && 'dash-gauge-bar-warn',
                  rateLimitPct <= 5 && 'dash-gauge-bar-danger'
                )}
                style={{ width: `${rateLimitPct}%` }}
              />
            </div>
            <span className="dash-ops-meta">
              {data?.rateLimit?.bucket ?? 'api'} · {rateLimitPct.toFixed(0)}% {t('dashboard.rateRemaining')}
            </span>
          </div>

          {isWidgetVisible('automation_pipeline') && (
            <div className="dash-ops-card">
              <div className="dash-ops-card-head">
                <CheckCircle2 size={18} />
                <span>{t('dashboard.pipelineTitle')}</span>
              </div>
              <span className="dash-gauge-value dash-ops-pipeline-value">{data?.stats.tasksCount ?? 0}</span>
              <span className="dash-ops-meta">{t('dashboard.pipelineTasks')}</span>
              <div className="dash-ops-stats">
                {isWidgetVisible('upload_success') && (
                  <div>
                    <span>{t('dashboard.uploadRecords')}</span>
                    <strong>{data?.stats.uploadHistory ?? 0}</strong>
                  </div>
                )}
                <div>
                  <span>{t('dashboard.trackedItems')}</span>
                  <strong>{data?.listingCount ?? 0}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {hasAnyModule && (
        <DashboardIntegrationCards
          telegramConfigured={data?.telegramConfigured ?? false}
          imapCount={data?.imapConfigs.length ?? 0}
          uploadEnabled={uploadEnabled}
          activityCount={visibleActivity.length}
          uploadHistoryCount={data?.uploads.length ?? 0}
          buyerEnabled={buyerEnabled}
          seenListingsCount={data?.listingCount ?? 0}
        />
      )}

      {hasAnyModule && showCharts && (
        <>
          {showDonutCharts && (
            <div className="dash-analytics-donuts">
              {showFinanceOverview && (
                <Card
                  title={t('dashboard.financeOverview')}
                  className="card-main dash-chart-card dash-chart-card-donut"
                  >
                  <DonutChart
                    data={financeDonut.segments}
                    valueFormat="currency"
                    centerLabel={financeDonut.centerLabel}
                    centerValue={financeDonut.centerValue}
                  />
                </Card>
              )}

              {isWidgetVisible('upload_success') && (data?.uploads.length ?? 0) > 0 && (
                <Card
                  title={t('dashboard.uploadStatusSplit')}
                  className="card-main dash-chart-card dash-chart-card-donut"
                >
                  <DonutChart
                    data={[
                      { label: t('dashboard.uploadOk'), value: uploadSuccessCount, color: '#00ba78' },
                      { label: t('common.error'), value: uploadFailCount, color: '#e05252' }
                    ]}
                    valueFormat="number"
                    centerLabel={t('dashboard.uploadSuccess')}
                    centerValue={`${uploadSuccessPct.toFixed(0)}%`}
                  />
                </Card>
              )}
            </div>
          )}

          {isWidgetVisible('chart_upload_timeline') && (
            <div className="dash-analytics-grid">
              <Card title={t('dashboard.chartUploadTimeline')} className="card-main dash-chart-card">
                <RevenueLineChart
                  data={uploadTimeline}
                  valueFormat="number"
                  valueLabelKey="dashboard.uploadCount"
                />
              </Card>
            </div>
          )}
        </>
      )}

      {hasAnyModule && (isWidgetVisible('reseller_margin') || isWidgetVisible('upload_success')) && (
        <div className="dash-detail-grid">
          {isWidgetVisible('reseller_margin') && (
            <Card
              title={t('dashboard.recentDeals')}
              className="card-main dash-detail-card"
              actions={
                <NavLink to="/reseller" className="dash-card-link">
                  {t('dashboard.viewAllReseller')} <ArrowUpRight size={14} />
                </NavLink>
              }
            >
              {recentDeals.length === 0 ? (
                <p className="empty-state">{t('dashboard.noDeals')}</p>
              ) : (
                <ul className="dash-recent-list">
                  {recentDeals.map((d) => {
                    const margin = d.margin ?? 0
                    return (
                      <li key={d.id} className="dash-recent-item">
                        <span
                          className={clsx(
                            'dash-recent-badge',
                            margin >= 0 ? 'is-success' : 'is-error'
                          )}
                        >
                          {d.category ?? t('dashboard.uncategorized')}
                        </span>
                        <span className="dash-recent-meta">
                          <span className={clsx('dash-recent-value', margin >= 0 ? 'text-success' : 'text-danger')}>
                            {formatRub(margin)}
                          </span>
                          <span className="dash-recent-sep">·</span>
                          <time dateTime={d.created_at}>
                            {new Date(d.created_at).toLocaleString()}
                          </time>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          )}

          {isWidgetVisible('upload_success') && (
            <Card
              title={t('dashboard.recentUploads')}
              className="card-main dash-detail-card"
              actions={
                <NavLink to="/upload" className="dash-card-link">
                  {t('dashboard.viewAllUpload')} <ArrowUpRight size={14} />
                </NavLink>
              }
            >
              {recentUploads.length === 0 ? (
                <p className="empty-state">{t('common.noData')}</p>
              ) : (
                <ul className="dash-recent-list">
                  {recentUploads.map((u) => (
                    <li key={u.id} className="dash-recent-item">
                      <span
                        className={clsx(
                          'dash-recent-badge',
                          isUploadHistorySuccess(u.status) && 'is-success',
                          isUploadHistoryFailure(u.status) && 'is-error',
                          !isUploadHistorySuccess(u.status) &&
                            !isUploadHistoryFailure(u.status) &&
                            'is-pending'
                        )}
                      >
                        {u.login}
                      </span>
                      <span className="dash-recent-meta">
                        <span className="dash-recent-category">{u.category ?? '—'}</span>
                        <span className="dash-recent-sep">·</span>
                        <time dateTime={u.created_at}>
                          {new Date(u.created_at).toLocaleString()}
                        </time>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )

  const aside =
    token && alerts.length > 0 ? (
      <div className="dashboard-aside-stack">
        <Card title={t('dashboard.alertsTitle')} accent className="card-aside card-aside-compact">
          <ul className="dash-alerts">
            {alerts.map((alert) => (
              <li key={alert.key} className={clsx('dash-alert', `dash-alert-${alert.tone}`)}>
                <AlertTriangle size={14} />
                <span>{alert.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    ) : undefined

  return (
    <PageLayout
      title={t('dashboard.title')}
      subtitle={hasAnyModule ? t('dashboard.subtitle') : t('dashboard.subtitleMinimal')}
      main={main}
      aside={aside}
    />
  )
}
