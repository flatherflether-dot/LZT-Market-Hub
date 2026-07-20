import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Plus,
  Trash2,
  TrendingDown,
  Users
} from 'lucide-react'
import { Card } from '@components/Card'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { formatRub, marketItemUrl } from '@core/market-utils'
import { downloadCsv, toCsv } from '@core/export-csv'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import { useAutoRefresh } from '@core/use-auto-refresh'
import type {
  CompetitorWatchEntry,
  StoredCompetitorListing,
  StoredListingMatch
} from '@renderer/types/database'

type CompetitorView = 'listings' | 'matches'

function formatSyncTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export interface AnalyticsCompetitorsTabProps {
  myAvgPrice: number | null
  onTrackMyListings: () => void
}

export function AnalyticsCompetitorsTab(props: AnalyticsCompetitorsTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [watchlist, setWatchlist] = useState<CompetitorWatchEntry[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [listings, setListings] = useState<StoredCompetitorListing[]>([])
  const [matches, setMatches] = useState<StoredListingMatch[]>([])
  const [view, setView] = useState<CompetitorView>('matches')
  const [newUserId, setNewUserId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refreshWatchlist = useCallback(async (): Promise<void> => {
    setWatchlist(await window.api.db.getCompetitorWatchlist())
  }, [])

  const loadCompetitorData = useCallback(async (userId: string): Promise<void> => {
    const [storedListings, storedMatches] = await Promise.all([
      window.api.db.getCompetitorListings(userId),
      window.api.db.getListingMatches(userId)
    ])
    setListings(storedListings)
    setMatches(storedMatches)
  }, [])

  const syncAll = useCallback(async (silent = false): Promise<{ synced: number; totalMatches: number } | null> => {
    setError(null)
    try {
      props.onTrackMyListings()
      const result = await window.api.db.syncAllCompetitors()
      await refreshWatchlist()
      if (!silent) {
        notify(
          t('tabs.competitors'),
          t('analytics.competitorsSyncDone', {
            synced: result.synced,
            matches: result.totalMatches
          }),
          'success'
        )
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : t('analytics.syncFailed')
      setError(message)
      if (!silent) notify(t('tabs.competitors'), message, 'error')
      return null
    }
  }, [props, refreshWatchlist, t])

  const runBackgroundSync = useCallback(async (): Promise<void> => {
    const result = await syncAll(true)
    if (result && selectedUserId) await loadCompetitorData(selectedUserId)
  }, [loadCompetitorData, selectedUserId, syncAll])

  useEffect(() => {
    void refreshWatchlist()
  }, [refreshWatchlist])

  useEffect(() => {
    void runBackgroundSync()
  }, [runBackgroundSync])

  useAutoRefresh(() => runBackgroundSync(), [runBackgroundSync])

  useEffect(() => {
    if (!selectedUserId && watchlist.length > 0) {
      setSelectedUserId(watchlist[0].user_id)
    }
  }, [selectedUserId, watchlist])

  useEffect(() => {
    if (selectedUserId) void loadCompetitorData(selectedUserId)
  }, [loadCompetitorData, selectedUserId])

  const selectedEntry = useMemo(
    () => watchlist.find((w) => w.user_id === selectedUserId) ?? null,
    [selectedUserId, watchlist]
  )

  const competitorStats = useMemo(() => {
    if (listings.length === 0) return null
    const prices = listings.map((i) => i.price)
    const sum = prices.reduce((a, b) => a + b, 0)
    return {
      count: listings.length,
      avg: Math.round(sum / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }, [listings])

  async function addCompetitor(): Promise<void> {
    const uid = newUserId.trim()
    if (!uid) return
    setError(null)
    try {
      await window.api.db.addCompetitorWatch(uid, newLabel.trim() || undefined)
      setNewUserId('')
      setNewLabel('')
      await refreshWatchlist()
      setSelectedUserId(uid)
      await window.api.db.syncCompetitorWatch(uid)
      await refreshWatchlist()
      await loadCompetitorData(uid)
      notify(t('tabs.competitors'), t('analytics.competitorAdded'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('analytics.competitorFailed'))
    }
  }

  async function removeCompetitor(id: number, userId: string): Promise<void> {
    await window.api.db.removeCompetitorWatch(id)
    if (selectedUserId === userId) {
      setSelectedUserId(null)
      setListings([])
      setMatches([])
    }
    await refreshWatchlist()
  }

  async function toggleCompetitor(id: number, enabled: boolean): Promise<void> {
    await window.api.db.setCompetitorWatchEnabled(id, enabled)
    await refreshWatchlist()
  }

  function exportListings(): void {
    if (!selectedUserId) return
    downloadCsv(
      `competitor-${selectedUserId}.csv`,
      toCsv(listings as unknown as Record<string, unknown>[], [
        'item_id',
        'title',
        'price',
        'category'
      ])
    )
  }

  return (
    <div className="competitors-hub">
      {error && <div className="alert alert-error analytics-sync-error">{error}</div>}

      <Card className="settings-form-card competitors-add-card">
        <div className="competitors-add-form">
          <Input
            label={t('analytics.sellerUserId')}
            type="number"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && newUserId && void addCompetitor()}
          />
          <Input
            label={t('analytics.competitorLabel')}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('analytics.competitorLabelPlaceholder')}
          />
          <div className="competitors-add-action">
            <Button variant="primary" onClick={() => void addCompetitor()} disabled={!newUserId}>
              <Plus size={14} />
              {t('analytics.addCompetitor')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="competitors-layout">
        <Card className="settings-form-card competitors-watchlist-card" title={t('analytics.trackedCompetitors')}>
          {watchlist.length === 0 ? (
            <p className="empty-state">{t('analytics.noCompetitorsHint')}</p>
          ) : (
            <ul className="competitors-watchlist">
              {watchlist.map((entry) => {
                const active = entry.user_id === selectedUserId
                return (
                  <li key={entry.id} className={clsx('competitors-watch-item', active && 'is-active')}>
                    <button
                      type="button"
                      className="competitors-watch-main"
                      onClick={() => setSelectedUserId(entry.user_id)}
                    >
                      <span className="competitors-watch-name">
                        {entry.label || entry.username || `#${entry.user_id}`}
                      </span>
                      <span className="competitors-watch-meta">
                        ID {entry.user_id} · {entry.listing_count} {t('analytics.listingsShort')}
                      </span>
                      <span className="competitors-watch-sync muted">
                        {t('analytics.lastSync', { time: formatSyncTime(entry.last_sync_at) })}
                      </span>
                    </button>
                    <div className="competitors-watch-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        title={entry.is_enabled ? t('common.off') : t('common.on')}
                        onClick={() => void toggleCompetitor(entry.id, !entry.is_enabled)}
                      >
                        {entry.is_enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void removeCompetitor(entry.id, entry.user_id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="card-main settings-form-card competitors-detail-card">
          {!selectedEntry ? (
            <div className="competitors-empty-detail">
              <Users size={32} />
              <p>{t('analytics.selectCompetitorHint')}</p>
            </div>
          ) : (
            <>
              <header className="competitors-detail-head">
                <div>
                  <h3>{selectedEntry.label || selectedEntry.username || `#${selectedEntry.user_id}`}</h3>
                  <p className="muted">
                    {t('analytics.competitorDetailDesc', { id: selectedEntry.user_id })}
                  </p>
                </div>
                <div className="competitors-detail-actions">
                  <Button size="sm" variant="secondary" onClick={exportListings} disabled={listings.length === 0}>
                    <Download size={14} />
                    {t('analytics.exportCompetitor')}
                  </Button>
                </div>
              </header>

              {competitorStats && (
                <div className="analytics-competitor-stats">
                  <div className="analytics-competitor-stats-grid">
                    <div className="analytics-kpi-card analytics-kpi-card-inline">
                      <TrendingDown size={16} />
                      <span>
                        {t('analytics.competitorStats', {
                          count: competitorStats.count,
                          avg: competitorStats.avg
                        })}
                      </span>
                    </div>
                    {props.myAvgPrice !== null && (
                      <div className="analytics-kpi-card analytics-kpi-card-inline">
                        <Link2 size={16} />
                        <span>
                          {t('analytics.myListings')}: {props.myAvgPrice} ₽ avg vs {competitorStats.avg} ₽
                        </span>
                      </div>
                    )}
                    <div className="analytics-kpi-card analytics-kpi-card-inline muted">
                      <span>
                        {t('analytics.competitorMinMax', {
                          min: competitorStats.min,
                          max: competitorStats.max
                        })}
                      </span>
                    </div>
                    <div className="analytics-kpi-card analytics-kpi-card-inline">
                      <Link2 size={16} />
                      <span>{t('analytics.smartMatchesCount', { count: matches.length })}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="competitors-view-tabs">
                <button
                  type="button"
                  className={clsx('competitors-view-tab', view === 'matches' && 'is-active')}
                  onClick={() => setView('matches')}
                >
                  {t('analytics.smartMatches')} ({matches.length})
                </button>
                <button
                  type="button"
                  className={clsx('competitors-view-tab', view === 'listings' && 'is-active')}
                  onClick={() => setView('listings')}
                >
                  {t('analytics.allListings')} ({listings.length})
                </button>
              </div>

              {view === 'matches' ? (
                matches.length === 0 ? (
                  <p className="empty-state">{t('analytics.noMatchesHint')}</p>
                ) : (
                  <ul className="competitors-match-list">
                    {matches.map((m) => {
                      const diff = (m.our_price ?? 0) - (m.competitor_price ?? 0)
                      const cheaper = diff > 0
                      return (
                        <li key={`${m.our_item_id}-${m.competitor_item_id}`} className="competitors-match-row">
                          <div className="competitors-match-side">
                            <span className="competitors-match-label">{t('analytics.myLot')}</span>
                            <span className="tools-result-id">#{m.our_item_id}</span>
                            <span className="tools-result-title">{m.our_title ?? '—'}</span>
                            <span className="tools-result-price">{formatRub(m.our_price)}</span>
                          </div>
                          <div className="competitors-match-center">
                            <span className="competitors-match-score">
                              {Math.round(m.match_score * 100)}%
                            </span>
                            <span className={clsx('competitors-match-diff', cheaper && 'is-higher')}>
                              {cheaper ? `+${diff} ₽` : `${diff} ₽`}
                            </span>
                          </div>
                          <div className="competitors-match-side">
                            <span className="competitors-match-label">{t('analytics.theirLot')}</span>
                            <span className="tools-result-id">#{m.competitor_item_id}</span>
                            <span className="tools-result-title">{m.competitor_title ?? '—'}</span>
                            <span className="tools-result-price">{formatRub(m.competitor_price)}</span>
                          </div>
                          <a
                            className="tools-result-link"
                            href={marketItemUrl(m.competitor_item_id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )
              ) : listings.length === 0 ? (
                <p className="empty-state">{t('common.noData')}</p>
              ) : (
                <ul className="tools-result-list">
                  {listings.map((item) => (
                    <li key={item.item_id} className="tools-result-row">
                      <div className="tools-result-main">
                        <span className="tools-result-id">#{item.item_id}</span>
                        <span className="tools-result-title">{item.title}</span>
                        <span className="tools-result-cat muted">{item.category}</span>
                        <span className="tools-result-price">{formatRub(item.price)}</span>
                      </div>
                      <a
                        className="tools-result-link"
                        href={marketItemUrl(item.item_id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('analytics.openOnMarket')}
                        <ExternalLink size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
