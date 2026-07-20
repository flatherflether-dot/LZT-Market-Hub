import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  ExternalLink,
  Inbox,
  Package,
  RefreshCw,
  Wrench
} from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { ItemLotToolsPanel } from '@components/ItemLotToolsPanel'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketItem } from '@core/constants'
import { formatMarketText, normalizeMarketItem } from '@core/market-utils'
import { useCategoryOptions, useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { getCategoryVisual } from '../upload/category-visuals'

function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export interface BuyerPurchasesToolsPanelProps {
  selectedId: number | null
}

export function BuyerPurchasesToolsPanel(props: BuyerPurchasesToolsPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="buyer-purchases-panel">
      <header className="buyer-purchases-panel-head">
        <Wrench size={18} />
        <div>
          <h3>{t('itemTools.title')}</h3>
          <p>{t('itemTools.selectItem')}</p>
        </div>
      </header>

      {props.selectedId ? (
        <div className="buyer-purchases-panel-body">
          <div className="buyer-purchases-selected-badge">#{props.selectedId}</div>
          <ItemLotToolsPanel itemId={props.selectedId} showListingActions />
        </div>
      ) : (
        <div className="buyer-purchases-panel-empty">
          <Wrench size={28} />
          <p>{t('itemTools.selectItem')}</p>
        </div>
      )}
    </div>
  )
}

export interface PurchasesTabProps {
  selectedId: number | null
  onSelect: (itemId: number | null) => void
}

export function PurchasesTab({ selectedId, onSelect }: PurchasesTabProps): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()
  const [orders, setOrders] = useState<MarketItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')
  const [downloading, setDownloading] = useState(false)

  async function downloadPurchased(): Promise<void> {
    setDownloading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().downloadUserData('orders')
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      await window.api.export.saveCsv('purchased-accounts.txt', content)
      setStatus(t('buyer.purchasesDownloaded'))
      setStatusKind('success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    } finally {
      setDownloading(false)
    }
  }

  const refreshOrders = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const { data } = await getApiClient().getOrders<{ items?: MarketItem[] }>({ page: 1 })
      setOrders((data.items ?? []).map(normalizeMarketItem))
    } catch (e) {
      if (!silent) {
        const message = e instanceof LztApiError ? e.message : t('common.error')
        setStatus(message)
        setStatusKind('error')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refreshOrders(false)
  }, [refreshOrders])

  useAutoRefresh(() => refreshOrders(true), [refreshOrders])

  const filtered = useMemo(() => {
    let list = orders
    if (categoryFilter) {
      list = list.filter((o) => {
        const category = formatMarketText(o.category)
        return category === categoryFilter || String(o.category_id) === categoryFilter
      })
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      list = list.filter((o) => {
        const ts = (o.published_date ?? o.publishedDate ?? 0) * 1000
        return !ts || ts >= from
      })
    }
    return list
  }, [orders, categoryFilter, dateFrom])

  const total = filtered.reduce((sum, item) => sum + (item.price ?? 0), 0)

  return (
    <div className="buyer-hub">
      <section className="buyer-section buyer-purchases-card">
        <header className="buyer-purchases-head">
          <div className="buyer-purchases-head-main">
            <div className="buyer-purchases-head-icon">
              <Package size={18} />
            </div>
            <div>
              <h3>{t('buyer.purchasesTitle')}</h3>
              <p>{t('buyer.purchasesLead')}</p>
            </div>
          </div>
          <div className="buyer-purchases-toolbar">
            <Button
              size="sm"
              variant="primary"
              className="buyer-purchases-download"
              onClick={() => void downloadPurchased()}
              disabled={downloading}
            >
              <Download size={14} />
              {downloading ? '…' : t('buyer.downloadPurchased')}
            </Button>
          </div>
        </header>

        <div className="buyer-purchases-body">
          <div className="buyer-purchases-stats">
            <div className="buyer-purchases-stat">
              <span>{t('buyer.purchasesTitle')}</span>
              <strong>{filtered.length}</strong>
            </div>
            <div className="buyer-purchases-stat is-total">
              <span>{t('buyer.purchasesTotal')}</span>
              <strong>{total.toFixed(0)} ₽</strong>
            </div>
          </div>

          <div className="buyer-purchases-filters">
            <Select
              label={t('common.category')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ value: '', label: t('buyer.filterAllCategories') }, ...categoryOptions]}
            />
            <Input
              label={t('buyer.filterDateFrom')}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="buyer-empty">
              {loading ? <RefreshCw size={32} className="spin-icon" /> : <Inbox size={32} />}
              <p>{loading ? t('layout.loadingProfile') : t('buyer.purchasesEmpty')}</p>
            </div>
          ) : (
            <div className="buyer-purchases-list">
              {filtered.map((item) => {
                const visual = getCategoryVisual(item.category)
                const Icon = visual.icon
                const selected = selectedId === item.item_id

                return (
                  <article
                    key={item.item_id}
                    className={clsx('buyer-purchases-row', selected && 'is-selected')}
                  >
                    <div className="buyer-listing-icon" style={{ background: visual.gradient }}>
                      {visual.logoUrl ? (
                        <img src={visual.logoUrl} alt="" className="buyer-listing-logo" />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>

                    <div className="buyer-listing-body">
                      <div className="buyer-listing-head">
                        <a
                          className="buyer-listing-title"
                          href={`https://lzt.market/${item.item_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatMarketText(item.title) || `#${item.item_id}`}
                        </a>
                        <span className="buyer-listing-price">{item.price} ₽</span>
                      </div>
                      <div className="buyer-listing-meta">
                        <span>#{item.item_id}</span>
                        <span>{visual.label}</span>
                      </div>
                    </div>

                    <div className="buyer-purchases-row-actions">
                      <Button
                        size="sm"
                        variant={selected ? 'primary' : 'secondary'}
                        onClick={() => onSelect(selected ? null : item.item_id)}
                      >
                        <Wrench size={14} />
                        {t('buyer.openTools')}
                      </Button>
                      <a
                        className="buyer-listing-link"
                        href={`https://lzt.market/${item.item_id}`}
                        target="_blank"
                        rel="noreferrer"
                        title={t('buyer.openOnMarket')}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {status && (
            <div
              className={clsx(
                'buyer-status-banner',
                statusKind === 'success' && 'is-success',
                statusKind === 'error' && 'is-error'
              )}
            >
              {isTokenError(status) ? t('layout.apiOfflineHint') : status}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
