import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { getApiClient, LztApiError } from '@core/api-client'
import { autoLogDeal } from '@core/deal-auto-log'
import { type MarketItem } from '@core/constants'
import { resolveItemTitle } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { PurchasesTab, BuyerPurchasesToolsPanel } from '@modules/buyer/PurchasesTab'
import { DiscountsTab } from '@modules/buyer/DiscountsTab'
import { ViewedTab } from '@modules/buyer/ViewedTab'
import { BuyerMonitorControlPanel } from '@modules/buyer/BuyerMonitorPanels'
import { BuyerCartCheckoutPanel, BuyerCartTab } from '@modules/buyer/BuyerCartTab'
import { BuyerMonitorTab } from '@modules/buyer/BuyerMonitorTab'
import { BuyerFiltersTab } from '@modules/buyer/BuyerFiltersTab'
import { BuyerWatchlistPanel, BuyerWatchlistTab } from '@modules/buyer/BuyerWatchlistTab'
import {
  buildFilterParamsJson,
  filterParamsToForm,
  resolvePreviewFilter
} from '@modules/buyer/buyer-filter-utils'
import type { WatchFilter, WatchlistItem } from '@renderer/types/database'

type BuyerTab = 'monitor' | 'filters' | 'watchlist' | 'cart' | 'purchases' | 'discounts' | 'viewed'

const BUYER_TABS = ['monitor', 'filters', 'watchlist', 'cart', 'purchases', 'discounts', 'viewed'] as const
type CartCheckoutMode = 'confirm' | 'safe'

export function BuyerPage(): React.ReactNode {
  const { t } = useTranslation()
  const [tab] = useQueryTab<BuyerTab>('tab', 'monitor', BUYER_TABS)
  const [filters, setFilters] = useState<WatchFilter[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [cartItems, setCartItems] = useState<MarketItem[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('steam')
  const [pmax, setPmax] = useState('500')
  const [pmin, setPmin] = useState('')
  const [extraParams, setExtraParams] = useState<Record<string, string | number | boolean>>({})
  const [editingFilterId, setEditingFilterId] = useState<number | null>(null)
  const [activeFilterId, setActiveFilterId] = useState<number | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [latestItems, setLatestItems] = useState<MarketItem[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<number | null>(null)
  const [watchItemId, setWatchItemId] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [cartMaxTotal, setCartMaxTotal] = useState('5000')
  const [cartMaxItems, setCartMaxItems] = useState('10')
  const [batchCheckingOut, setBatchCheckingOut] = useState(false)
  const [cartCheckoutMode, setCartCheckoutMode] = useState<CartCheckoutMode>('confirm')
  const [purchaseSelectedId, setPurchaseSelectedId] = useState<number | null>(null)

  useEffect(() => {
    void refresh()
    void window.api.monitor.status().then(setIsMonitoring)
    void window.api.db.getSetting('cart_batch_max_total').then((v) => { if (v) setCartMaxTotal(v) })
    void window.api.db.getSetting('cart_batch_max_items').then((v) => { if (v) setCartMaxItems(v) })
    void window.api.db.getSetting('cart_checkout_mode').then((v) => {
      if (v === 'safe' || v === 'confirm') setCartCheckoutMode(v)
    })
  }, [])

  async function refresh(): Promise<void> {
    setFilters(await window.api.db.getWatchFilters())
    setWatchlist(await window.api.db.getWatchlist())
    await refreshCart()
  }

  const backgroundRefresh = useCallback(async (): Promise<void> => {
    await refresh()
  }, [])

  useAutoRefresh(() => backgroundRefresh(), [backgroundRefresh])

  async function saveCartSettings(): Promise<void> {
    await window.api.db.setSetting('cart_batch_max_total', cartMaxTotal)
    await window.api.db.setSetting('cart_batch_max_items', cartMaxItems)
    await window.api.db.setSetting('cart_checkout_mode', cartCheckoutMode)
  }

  async function checkoutItem(item: MarketItem): Promise<boolean> {
    const client = getApiClient()
    if (cartCheckoutMode === 'confirm') {
      await client.confirmBuy(item.item_id, item.price)
    } else {
      await client.fastBuy(item.item_id, item.price)
    }
    await autoLogDeal({
      action: 'buy',
      item_id: item.item_id,
      buy_price: item.price,
      notes: item.title,
      source: cartCheckoutMode === 'confirm' ? 'cart_confirm' : 'cart_safe'
    })
    void window.api.webhook.fire('deal', {
      action: 'buy',
      source: cartCheckoutMode,
      item_id: item.item_id,
      buy_price: item.price,
      title: item.title
    })
    return true
  }

  async function batchCheckoutCart(): Promise<void> {
    if (!cartItems.length) return
    setBatchCheckingOut(true)
    const maxTotal = Number(cartMaxTotal) || Infinity
    const maxItems = Number(cartMaxItems) || cartItems.length
    let spent = 0
    let bought = 0

    for (const item of cartItems) {
      if (bought >= maxItems) break
      if (spent + item.price > maxTotal) continue
      try {
        await checkoutItem(item)
        spent += item.price
        bought++
      } catch (e) {
        notify(t('buyer.buyFailed'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
        break
      }
      await new Promise((r) => setTimeout(r, 600))
    }

    notify(t('buyer.batchCheckoutTitle'), t('buyer.batchCheckoutDone', { count: bought, total: spent }), 'success')
    await refreshCart()
    setBatchCheckingOut(false)
  }

  async function refreshCart(): Promise<void> {
    try {
      const { data } = await getApiClient().getCart<{ items?: MarketItem[] }>()
      setCartItems(data.items ?? [])
    } catch {
      setCartItems([])
    }
  }

  async function saveFilter(): Promise<void> {
    if (!name.trim()) return
    const existing = editingFilterId ? filters.find((f) => f.id === editingFilterId) : undefined
    const savedId = await window.api.db.saveWatchFilter({
      id: editingFilterId ?? undefined,
      name: name.trim(),
      category,
      params_json: buildFilterParamsJson(pmin, pmax, extraParams),
      is_enabled: existing?.is_enabled ?? 1
    })
    setEditingFilterId(Number(savedId))
    await refresh()
    await window.api.db.logActivity('buyer', 'filter_saved', name.trim())
    notify(t('buyer.savedFilters'), t('buyer.filterSaved'), 'success')
  }

  function resetFilterForm(): void {
    setEditingFilterId(null)
    setName('')
    setCategory('steam')
    setPmin('')
    setPmax('500')
    setExtraParams({})
  }

  function loadFilterIntoForm(filter: WatchFilter): void {
    const form = filterParamsToForm(filter.params_json)
    setEditingFilterId(filter.id)
    setName(filter.name)
    setCategory(filter.category)
    setPmin(form.pmin)
    setPmax(form.pmax)
    setExtraParams(form.extraParams)
  }

  async function toggleFilterEnabled(filter: WatchFilter): Promise<void> {
    await window.api.db.saveWatchFilter({
      id: filter.id,
      name: filter.name,
      category: filter.category,
      params_json: filter.params_json,
      is_enabled: filter.is_enabled ? 0 : 1
    })
    await refresh()
  }

  async function deleteFilter(id: number): Promise<void> {
    await window.api.db.deleteWatchFilter(id)
    if (editingFilterId === id) resetFilterForm()
    if (activeFilterId === id) setActiveFilterId(null)
    await refresh()
  }

  async function toggleMonitoring(): Promise<void> {
    if (isMonitoring) {
      await window.api.monitor.stop()
      setIsMonitoring(false)
      setStatus(t('buyer.monitorStopped'))
      return
    }
    await window.api.db.clearSeenListings()
    await window.api.monitor.start()
    setIsMonitoring(true)
    setStatus(t('buyer.monitorStarted'))
    await window.api.db.logActivity('buyer', 'monitor_started')
    await pollPreview()
  }

  async function pollPreview(): Promise<void> {
    try {
      const f = resolvePreviewFilter(filters, activeFilterId, {
        category,
        params_json: buildFilterParamsJson(pmin, pmax, extraParams)
      })
      const params = JSON.parse(f.params_json) as Record<string, number | string | boolean>
      const { data } = await getApiClient().searchCategory<{ items: MarketItem[] }>(f.category ?? category, {
        ...params,
        order_by: 'pdate_to_down'
      })
      setLatestItems(data.items.slice(0, 15))
      setStatus(t('buyer.previewStatus', { count: data.items.length, time: new Date().toLocaleTimeString() }))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('buyer.searchError'))
    }
  }

  async function fastBuy(item: MarketItem): Promise<void> {
    setBuyingId(item.item_id)
    try {
      await checkoutItem(item)
      notify(t('buyer.purchased'), `${item.title} — ${item.price} ₽`, 'success')
      await window.api.db.logActivity('buyer', 'fast_buy', String(item.item_id))
    } catch (e) {
      notify(t('buyer.buyFailed'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    } finally {
      setBuyingId(null)
    }
  }

  async function addToCart(item: MarketItem): Promise<void> {
    try {
      await getApiClient().addToCart(item.item_id)
      await refreshCart()
      notify(t('buyer.cart'), t('buyer.cartAdded', { id: item.item_id }), 'success')
    } catch (e) {
      notify(t('buyer.cartError'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  async function addWatchlist(): Promise<void> {
    const id = Number(watchItemId)
    if (!id) return
    let title = ''
    let price = 0
    try {
      const { data } = await getApiClient().getItem<{ item?: MarketItem } & MarketItem>(id)
      const raw = data as { item?: MarketItem } & MarketItem
      const item = raw.item ?? raw
      title = resolveItemTitle(data)
      price = item.price ?? 0
    } catch {
    }
    await window.api.db.addWatchlist({
      item_id: id,
      title,
      price,
      target_price: targetPrice ? Number(targetPrice) : undefined
    })
    setWatchItemId('')
    setTargetPrice('')
    await refresh()
  }

  async function addFavoriteItem(item: MarketItem): Promise<void> {
    try {
      await getApiClient().addFavorite(item.item_id)
      notify(t('buyer.favoriteTitle'), t('buyer.favoriteAdded', { id: item.item_id }), 'success')
    } catch (e) {
      notify(t('common.error'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  async function clearCart(): Promise<void> {
    try {
      await getApiClient().clearCart()
      await refreshCart()
    } catch (e) {
      notify(t('buyer.cart'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  const monitorMain = (
    <BuyerMonitorTab
      latestItems={latestItems}
      buyingId={buyingId}
      onFastBuy={fastBuy}
      onAddToCart={addToCart}
      onAddFavorite={addFavoriteItem}
      defaultCategory={category}
    />
  )

  const filtersMain = (
    <BuyerFiltersTab
      filters={filters}
      editingFilterId={editingFilterId}
      name={name}
      setName={setName}
      category={category}
      setCategory={setCategory}
      pmin={pmin}
      setPmin={setPmin}
      pmax={pmax}
      setPmax={setPmax}
      extraParams={extraParams}
      setExtraParams={setExtraParams}
      onSelectFilter={loadFilterIntoForm}
      onNewFilter={resetFilterForm}
      onSaveFilter={saveFilter}
      onPreviewFilter={pollPreview}
      onDeleteFilter={(id) => void deleteFilter(id)}
      onToggleFilterEnabled={(filter) => void toggleFilterEnabled(filter)}
    />
  )

  const monitorAside = (
    <BuyerMonitorControlPanel
      filters={filters}
      activeFilterId={activeFilterId}
      setActiveFilterId={setActiveFilterId}
      isMonitoring={isMonitoring}
      status={status}
      onPreview={pollPreview}
      onToggleMonitor={toggleMonitoring}
    />
  )

  const watchlistMain = (
    <BuyerWatchlistTab
      watchlist={watchlist}
      onRemove={(itemId) => void window.api.db.removeWatchlist(itemId).then(refresh)}
    />
  )

  const watchlistAside = (
    <BuyerWatchlistPanel
      watchItemId={watchItemId}
      setWatchItemId={setWatchItemId}
      targetPrice={targetPrice}
      setTargetPrice={setTargetPrice}
      onAdd={addWatchlist}
    />
  )

  const cartMain = (
    <BuyerCartTab
      cartItems={cartItems}
      buyingId={buyingId}
      batchCheckingOut={batchCheckingOut}
      onBatchCheckout={batchCheckoutCart}
      onClear={clearCart}
      onBuy={fastBuy}
    />
  )

  const cartAside = (
    <BuyerCartCheckoutPanel
      cartCheckoutMode={cartCheckoutMode}
      setCartCheckoutMode={setCartCheckoutMode}
      cartMaxTotal={cartMaxTotal}
      setCartMaxTotal={setCartMaxTotal}
      cartMaxItems={cartMaxItems}
      setCartMaxItems={setCartMaxItems}
      onSave={saveCartSettings}
    />
  )

  const asideByTab: Record<BuyerTab, React.ReactNode> = {
    monitor: monitorAside,
    filters: undefined,
    watchlist: watchlistAside,
    cart: cartAside,
    purchases: (
      <BuyerPurchasesToolsPanel selectedId={purchaseSelectedId} />
    ),
    discounts: undefined,
    viewed: undefined
  }

  const mainByTab: Record<BuyerTab, React.ReactNode> = {
    monitor: monitorMain,
    filters: filtersMain,
    watchlist: watchlistMain,
    cart: cartMain,
    purchases: <PurchasesTab selectedId={purchaseSelectedId} onSelect={setPurchaseSelectedId} />,
    discounts: <DiscountsTab />,
    viewed: <ViewedTab />
  }

  const pageHeader = useMemo(() => {
    if (tab === 'filters') {
      return {
        title: t('tabs.filters'),
        subtitle: t('buyer.filtersDesc')
      }
    }
    return {
      title: t('buyer.title'),
      subtitle: t('buyer.subtitle')
    }
  }, [tab, t])

  return (
    <PageLayout
      title={pageHeader.title}
      subtitle={pageHeader.subtitle}
      badge={
        tab === 'monitor' ? (
          <span className={clsx('buyer-monitor-badge', isMonitoring && 'is-on')}>
            {isMonitoring ? t('common.on') : t('common.off')}
          </span>
        ) : undefined
      }
      main={mainByTab[tab]}
      aside={asideByTab[tab]}
    />
  )
}
