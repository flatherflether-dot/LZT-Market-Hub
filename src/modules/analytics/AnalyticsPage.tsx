import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { Card } from '@components/Card'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { getApiClient, LztApiError } from '@core/api-client'
import type { ProfileResponse, MarketItem } from '@core/constants'
import { formatRub, marketItemUrl, normalizeMarketItems } from '@core/market-utils'
import type { Deal } from '@renderer/types/database'
import { MarginBarChart, RevenueLineChart } from '@components/Charts'
import { useTranslation } from '@core/i18n'
import { useAuthStore } from '@core/auth-store'
import { useModulesHelpers } from '@core/modules-store'
import { notify } from '@core/ui-store'
import { AnalyticsCompetitorsTab } from './AnalyticsCompetitorsTab'
import { useAutoRefresh } from '@core/use-auto-refresh'

type AnalyticsTab = 'overview' | 'competitors'

const ANALYTICS_TABS = ['overview', 'competitors'] as const

function formatSyncTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function AnalyticsPage(): React.ReactNode {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { isAnalyticsVisible } = useModulesHelpers()
  const [tab, setTab] = useQueryTab<AnalyticsTab>('tab', 'overview', ANALYTICS_TABS)
  const [deals, setDeals] = useState<Deal[]>([])
  const [myItems, setMyItems] = useState<MarketItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const showReseller = isAnalyticsVisible('reseller_deals')
  const showCompetitors = isAnalyticsVisible('buyer_competitors')
  const showListings = isAnalyticsVisible('upload_listings')

  const availableTabIds = useMemo(() => {
    const ids: AnalyticsTab[] = ['overview']
    if (showCompetitors) ids.push('competitors')
    return ids
  }, [showCompetitors])

  useEffect(() => {
    if (!availableTabIds.includes(tab)) {
      setTab(availableTabIds[0] ?? 'overview')
    }
  }, [availableTabIds, tab, setTab])

  const refreshDeals = useCallback(async (): Promise<void> => {
    setDeals(await window.api.db.getDeals())
  }, [])

  const trackMyListings = useCallback((itemList: MarketItem[]): void => {
    void Promise.all(
      itemList.slice(0, 100).map((item) =>
        window.api.db.trackListing(
          item.item_id,
          item.price,
          item.title,
          item.category
        )
      )
    )
  }, [])

  const syncAll = useCallback(async (silent = false): Promise<void> => {
    if (!token) return

    setError(null)
    try {
      const client = getApiClient()
      const { data: prof } = await client.getProfile<ProfileResponse>()

      if (prof.user?.user_id) {
        const { data: itemsPayload } = await client.getMyItems<{ items?: MarketItem[]; totalItems?: number }>(
          prof.user.user_id,
          { page: 1 }
        )
        const itemList = normalizeMarketItems(itemsPayload)
        setMyItems(itemList)
        trackMyListings(itemList)
      }

      await refreshDeals()
      await window.api.db.logActivity('analytics', 'sync')
      setLastSyncedAt(new Date().toISOString())
      if (!silent) {
        notify(t('analytics.title'), t('analytics.syncDone'), 'success')
      }
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('analytics.syncFailed')
      setError(message)
      notify(t('analytics.title'), message, 'error')
    }
  }, [token, refreshDeals, t, trackMyListings])

  useEffect(() => {
    if (!token) return
    void syncAll(true)
  }, [token, syncAll])

  useAutoRefresh(() => syncAll(true), [syncAll], undefined, Boolean(token))

  const categoryBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of deals) {
      const c = d.category ?? 'other'
      m.set(c, (m.get(c) ?? 0) + (d.margin ?? 0))
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [deals])

  const topListings = useMemo(
    () => [...myItems].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 8),
    [myItems]
  )

  const myAvgPrice = useMemo(() => {
    if (myItems.length === 0) return null
    const sum = myItems.reduce((s, i) => s + (i.price ?? 0), 0)
    return Math.round(sum / myItems.length)
  }, [myItems])

  const hasOverviewContent =
    (showReseller && deals.length > 0) || (showListings && topListings.length > 0)

  const overviewMain = (
    <>
      {error && (
        <div className="alert alert-error analytics-sync-error">{error}</div>
      )}

      {!hasOverviewContent && !error && (
        <p className="empty-state">{t('analytics.noDealsHint')}</p>
      )}

      {showReseller && deals.length > 0 && (
      <div className="grid-2">
        <Card title={t('analytics.categoryBreakdown')} className="settings-form-card">
          <MarginBarChart
            data={categoryBreakdown.map(([cat, val]) => ({ label: cat, value: Math.round(val) }))}
          />
        </Card>

        <Card title={t('analytics.revenueOverTime')} className="settings-form-card">
          <RevenueLineChart
            data={[...deals]
              .reverse()
              .slice(-12)
              .map((d) => ({
                label: new Date(d.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                }),
                value: Math.round(d.margin ?? 0)
              }))}
          />
        </Card>
      </div>
      )}

      {showListings && (
      <div className={clsx(showReseller && deals.length > 0 && 'page-grid-top-spaced')}>
        <Card title={t('analytics.topListings')} className="settings-form-card">
          {topListings.length === 0 ? (
            <p className="empty-state">{t('common.noData')}</p>
          ) : (
            <ul className="tools-result-list">
              {topListings.map((item) => (
                <li key={item.item_id} className="tools-result-row">
                  <div className="tools-result-main">
                    <span className="tools-result-id">#{item.item_id}</span>
                    <span className="tools-result-title">{item.title}</span>
                    <span className="tools-result-price">{formatRub(item.price)}</span>
                  </div>
                  <a
                    className="tools-result-link"
                    href={marketItemUrl(item.item_id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={13} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      )}
    </>
  )

  const pageHeader = useMemo(() => {
    if (tab === 'competitors' && showCompetitors) {
      return {
        title: t('tabs.competitors'),
        subtitle: t('analytics.competitorsDesc')
      }
    }
    return {
      title: t('analytics.title'),
      subtitle: t('analytics.overviewDesc')
    }
  }, [tab, showCompetitors, t])

  return (
    <PageLayout
      title={pageHeader.title}
      subtitle={pageHeader.subtitle}
      badge={
        lastSyncedAt
          ? t('analytics.lastSync', { time: formatSyncTime(lastSyncedAt) })
          : t('analytics.notSynced')
      }
      main={
        tab === 'competitors' && showCompetitors ? (
          <AnalyticsCompetitorsTab
            myAvgPrice={myAvgPrice}
            onTrackMyListings={() => trackMyListings(myItems)}
          />
        ) : (
          overviewMain
        )
      }
    />
  )
}
