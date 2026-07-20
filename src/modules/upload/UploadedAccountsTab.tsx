import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Download,
  LayoutGrid,
  List,
  Package,
  Search,
  TrendingUp,
  Wallet
} from 'lucide-react'
import { Button } from '@components/Button'
import { getApiClient, LztApiError } from '@core/api-client'
import { MARKET_CATEGORIES } from '@core/constants'
import type { MarketItem } from '@core/constants'
import { downloadCsv, toCsv } from '@core/export-csv'
import { parseBulkItemsMap } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { isUploadHistoryFailure, isUploadHistorySuccess } from '@core/upload-status'
import type { UploadHistoryEntry } from '@renderer/types/database'
import { AccountLotCard } from './AccountLotCard'
import { AccountLotModal } from './AccountLotModal'
import { getCategoryVisual } from './category-visuals'

type StatusFilter = 'all' | 'success' | 'failed'
type ViewMode = 'grid' | 'compact'
type LiveMap = Record<number, MarketItem>

export function useUploadedAccountsTab(refreshKey = 0, onGoToUpload?: () => void): {
  main: React.ReactNode
  aside: React.ReactNode
  accountCount: number
  successCount: number
} {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<UploadHistoryEntry[]>([])
  const [liveItems, setLiveItems] = useState<LiveMap>({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [onlyListed, setOnlyListed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [bulkChecking, setBulkChecking] = useState(false)

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      setEntries(await window.api.db.getUploadHistory())
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory(false)
  }, [loadHistory, refreshKey])

  useAutoRefresh(() => loadHistory(true), [loadHistory])

  const syncLiveData = useCallback(async (silent = false): Promise<void> => {
    const ids = [...new Set(entries.map((e) => e.item_id).filter((id): id is number => id != null))]
    if (ids.length === 0) {
      if (!silent) notify(t('upload.accountsTitle'), t('upload.accountsNoItemsToSync'), 'info')
      return
    }
    setSyncing(true)
    try {
      const map: Record<number, MarketItem> = {}
      for (let i = 0; i < ids.length; i += 250) {
        const { data } = await getApiClient().bulkGetItems(ids.slice(i, i + 250))
        Object.assign(map, parseBulkItemsMap(data))
      }
      setLiveItems(map)

      const priceUpdates = Object.values(map)
        .filter((item) => item.item_id && item.price != null && item.price > 0)
        .map((item) => ({ item_id: item.item_id, price: item.price }))

      if (priceUpdates.length > 0) {
        await window.api.db.syncUploadHistoryPrices(priceUpdates)
        setEntries(await window.api.db.getUploadHistory())
      }

      if (!silent) notify(t('upload.accountsTitle'), t('upload.accountsSynced', { count: ids.length }), 'success')
    } catch (e) {
      if (!silent) {
        notify(t('upload.accountsTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
      }
    } finally {
      setSyncing(false)
    }
  }, [entries, t])

  const listedItemIds = useMemo(
    () =>
      [...new Set(entries.map((e) => e.item_id).filter((id): id is number => id != null))]
        .sort((a, b) => a - b)
        .join(','),
    [entries]
  )

  useEffect(() => {
    if (!listedItemIds) return
    void syncLiveData(true)
  }, [listedItemIds])

  useAutoRefresh(
    () => syncLiveData(true),
    [syncLiveData],
    undefined,
    Boolean(listedItemIds)
  )

  const priceStats = useMemo(() => {
    let total = 0
    let priced = 0
    let listed = 0
    for (const row of entries) {
      if (!row.item_id) continue
      listed++
      const live = liveItems[row.item_id]
      const price = live?.price ?? row.current_price ?? row.initial_price
      if (typeof price === 'number' && price > 0) {
        total += price
        priced++
      }
    }
    return { total, priced, listed }
  }, [entries, liveItems])

  const totalValue = priceStats.total

  const categoryStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; listed: number; value: number }>()
    for (const row of entries) {
      const cat = row.category ?? 'other'
      const cur = map.get(cat) ?? { count: 0, listed: 0, value: 0 }
      cur.count++
      if (row.item_id) {
        cur.listed++
        const live = liveItems[row.item_id]
        const price = live?.price ?? row.current_price ?? row.initial_price
        if (price) cur.value += price
      }
      map.set(cat, cur)
    }
    return map
  }, [entries, liveItems])

  const categoryRail = useMemo((): Array<{ id: string; count: number }> => {
    const items: Array<{ id: string; count: number }> = MARKET_CATEGORIES.map((cat) => ({
      id: cat.id,
      count: categoryStatsMap.get(cat.id)?.count ?? 0
    }))
    const otherCount = categoryStatsMap.get('other')?.count ?? 0
    if (otherCount > 0) {
      items.push({ id: 'other', count: otherCount })
    }
    return items
  }, [categoryStatsMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((row) => {
      if (onlyListed && !row.item_id) return false
      if (statusFilter === 'success' && !isUploadHistorySuccess(row.status)) return false
      if (statusFilter === 'failed' && !isUploadHistoryFailure(row.status)) return false
      if (categoryFilter && row.category !== categoryFilter) return false
      if (q) {
        const live = row.item_id != null ? liveItems[row.item_id] : undefined
        const hay = `${row.login} ${row.item_id ?? ''} ${row.category ?? ''} ${row.message ?? ''} ${live?.title ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, search, categoryFilter, statusFilter, onlyListed, liveItems])

  const selectedEntry = useMemo(
    () => (selectedId != null ? entries.find((e) => e.id === selectedId) ?? null : null),
    [entries, selectedId]
  )

  const selectedLive = selectedEntry?.item_id != null ? liveItems[selectedEntry.item_id] : undefined

  const successCount = useMemo(
    () => entries.filter((e) => isUploadHistorySuccess(e.status) && e.item_id).length,
    [entries]
  )

  function toggleCheck(entryId: number): void {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }

  function toggleAllVisible(): void {
    const visibleIds = filtered.filter((r) => r.item_id).map((r) => r.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => checked.has(id))
    setChecked((prev) => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  function exportAccounts(): void {
    const rows = filtered.map((row) => {
      const live = row.item_id != null ? liveItems[row.item_id] : undefined
      return {
        login: row.login,
        item_id: row.item_id,
        category: row.category,
        status: row.status,
        message: row.message,
        title: live?.title ?? '',
        price: live?.price ?? row.current_price ?? row.initial_price ?? '',
        initial_price: row.initial_price ?? '',
        current_price: row.current_price ?? '',
        item_state: live?.item_state ?? '',
        created_at: row.created_at
      }
    })
    downloadCsv('uploaded-accounts.csv', toCsv(rows, ['login', 'item_id', 'category', 'status', 'message', 'title', 'price', 'initial_price', 'current_price', 'item_state', 'created_at']))
  }

  async function bulkCheckSelected(): Promise<void> {
    const ids = filtered.filter((r) => checked.has(r.id) && r.item_id).map((r) => r.item_id as number)
    if (ids.length === 0) return
    setBulkChecking(true)
    let ok = 0
    for (const id of ids) {
      try {
        await getApiClient().checkAccount(id)
        ok++
      } catch {  }
    }
    setBulkChecking(false)
    notify(t('upload.accountsBulkCheckTitle'), t('upload.accountsBulkCheckDone', { ok, total: ids.length }), 'info')
  }

  async function bumpItem(itemId: number): Promise<void> {
    try {
      await getApiClient().bumpItem(itemId)
      notify(t('upload.accountsTitle'), t('upload.accountsBumped'), 'success')
    } catch (e) {
      notify(t('upload.accountsTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  async function checkItem(itemId: number): Promise<void> {
    try {
      await getApiClient().checkAccount(itemId)
      notify(t('upload.accountsCheckTitle'), t('upload.accountsCheckOk'), 'success')
    } catch (e) {
      notify(t('upload.accountsCheckTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  const main = (
    <div className="accounts-hub">
      <div className="accounts-hub-header">
        <div className="accounts-hub-stats">
          <div className="accounts-stat accounts-stat-total">
            <div className="accounts-stat-body">
              <span>{t('upload.accountsTitle')}</span>
              <strong>{entries.length}</strong>
            </div>
            <div className="accounts-stat-icon">
              <Package size={18} />
            </div>
          </div>
          <div className="accounts-stat accounts-stat-success">
            <div className="accounts-stat-body">
              <span>{t('status.success')}</span>
              <strong>{successCount}</strong>
            </div>
            <div className="accounts-stat-icon">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="accounts-stat accounts-stat-value">
            <div className="accounts-stat-body">
              <span>{t('common.price')}</span>
              <strong>
                {priceStats.priced > 0
                  ? `${totalValue.toLocaleString('ru-RU')} ₽`
                  : priceStats.listed > 0
                    ? syncing
                      ? t('upload.accountsSyncing')
                      : t('upload.accountsPricePending')
                    : '—'}
              </strong>
            </div>
            <div className="accounts-stat-icon">
              <Wallet size={18} />
            </div>
          </div>
          <div className="accounts-stat accounts-stat-cats">
            <div className="accounts-stat-body">
              <span>{t('upload.accountsAllCategories')}</span>
              <strong>{MARKET_CATEGORIES.length}</strong>
            </div>
            <div className="accounts-stat-icon">
              <Search size={18} />
            </div>
          </div>
        </div>

        <div className="accounts-hub-toolbar">
          <div className="accounts-hub-search">
            <Search size={16} className="accounts-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('upload.accountsSearchPlaceholder')}
            />
          </div>

          <div className="accounts-status-pills">
            {(['all', 'success', 'failed'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={clsx('accounts-status-pill', statusFilter === id && 'active')}
                onClick={() => setStatusFilter(id)}
              >
                {id === 'all' ? t('upload.accountsStatusAll') : id === 'success' ? t('status.success') : t('status.error')}
              </button>
            ))}
          </div>

          <div className="accounts-toolbar-actions">
            <div className="accounts-view-toggle">
              <button type="button" className={clsx(viewMode === 'grid' && 'active')} onClick={() => setViewMode('grid')} title="Grid">
                <LayoutGrid size={16} />
              </button>
              <button type="button" className={clsx(viewMode === 'compact' && 'active')} onClick={() => setViewMode('compact')} title="List">
                <List size={16} />
              </button>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void syncLiveData()} disabled={syncing}>
              {syncing ? t('upload.accountsSyncing') : t('upload.accountsSync')}
            </Button>
            <Button size="sm" variant="ghost" onClick={exportAccounts} title={t('common.downloadCsv')}>
              <Download size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="accounts-hub-body">
        <aside className="accounts-cat-rail">
          <button
            type="button"
            className={clsx('accounts-cat-item', categoryFilter === '' && 'active')}
            onClick={() => setCategoryFilter('')}
          >
            <span className="accounts-cat-label">{t('upload.accountsAllCategories')}</span>
            <span className="accounts-cat-count">{entries.length}</span>
          </button>
          {categoryRail.map(({ id: cat, count }) => {
            const visual = getCategoryVisual(cat)
            const Icon = visual.icon
            return (
              <button
                key={cat}
                type="button"
                className={clsx(
                  'accounts-cat-item',
                  categoryFilter === cat && 'active',
                  count === 0 && 'is-empty'
                )}
                onClick={() => setCategoryFilter(cat)}
                style={{ '--cat-accent': visual.accent } as React.CSSProperties}
              >
                <span className="accounts-cat-icon" style={{ background: visual.gradient }}>
                  {visual.logoUrl ? (
                    <img src={visual.logoUrl} alt="" className="accounts-cat-logo" />
                  ) : (
                    <Icon size={14} />
                  )}
                </span>
                <span className="accounts-cat-label">{visual.label}</span>
                <span className="accounts-cat-count">{count}</span>
              </button>
            )
          })}
        </aside>

        <div className="accounts-hub-main">
          <div className="accounts-hub-filters">
            <label className="checkbox-row">
              <input type="checkbox" checked={onlyListed} onChange={(e) => setOnlyListed(e.target.checked)} />
              {t('upload.accountsOnlyListed')}
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                onChange={toggleAllVisible}
                checked={
                  filtered.filter((r) => r.item_id).length > 0 &&
                  filtered.filter((r) => r.item_id).every((r) => checked.has(r.id))
                }
              />
              {t('upload.accountsSelectAll')}
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="accounts-empty">
              <Package size={48} strokeWidth={1} />
              <p>{loading ? t('layout.loadingProfile') : t('upload.accountsEmpty')}</p>
            </div>
          ) : (
            <div className={clsx('accounts-lot-grid', viewMode === 'compact' && 'accounts-lot-grid-compact')}>
              {filtered.map((row) => (
                <AccountLotCard
                  key={row.id}
                  row={row}
                  live={row.item_id != null ? liveItems[row.item_id] : undefined}
                  checked={checked.has(row.id)}
                  onOpen={() => setSelectedId(row.id)}
                  onToggleCheck={() => toggleCheck(row.id)}
                  onBump={row.item_id ? () => void bumpItem(row.item_id!) : undefined}
                  onCheck={row.item_id ? () => void checkItem(row.item_id!) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {checked.size > 0 && (
        <div className="accounts-bulk-bar">
          <span>{t('upload.accountsBulkCheck', { count: checked.size })}</span>
          <Button size="sm" onClick={() => void bulkCheckSelected()} disabled={bulkChecking}>
            {bulkChecking ? t('upload.accountsChecking') : t('upload.accountsCheckValid')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {selectedEntry && (
        <AccountLotModal
          entry={selectedEntry}
          live={selectedLive}
          onClose={() => setSelectedId(null)}
          onGoToUpload={onGoToUpload}
          onPriceSaved={(itemId, price) => {
            setLiveItems((prev) => ({
              ...prev,
              [itemId]: { ...prev[itemId], item_id: itemId, price, title: prev[itemId]?.title ?? '' }
            }))
            void window.api.db.updateUploadHistoryPrice(itemId, price)
            void window.api.db.trackListing(itemId, price)
            void loadHistory()
          }}
        />
      )}
    </div>
  )

  return { main, aside: undefined, accountCount: filtered.length, successCount }
}
