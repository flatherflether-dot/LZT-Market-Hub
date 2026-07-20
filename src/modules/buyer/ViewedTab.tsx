import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Eye, Inbox, RefreshCw } from 'lucide-react'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketItem } from '@core/constants'
import { formatMarketText, normalizeMarketItems } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { getCategoryVisual } from '../upload/category-visuals'

function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export function ViewedTab(): React.ReactNode {
  const { t } = useTranslation()
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const { data } = await getApiClient().getViewedHistory<{ items?: MarketItem[] }>({ page: 1 })
      setItems(normalizeMarketItems(data))
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
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  const total = items.reduce((sum, item) => sum + (item.price ?? 0), 0)

  return (
    <div className="buyer-hub">
      <section className="buyer-section buyer-viewed-card">
        <header className="buyer-viewed-head">
          <div className="buyer-viewed-head-main">
            <div className="buyer-viewed-head-icon">
              <Eye size={18} />
            </div>
            <div>
              <h3>{t('buyer.viewedTitle')}</h3>
              <p>{t('buyer.viewedDesc', { count: items.length })}</p>
            </div>
          </div>
        </header>

        <div className="buyer-viewed-body">
          <div className="buyer-viewed-stats">
            <div className="buyer-viewed-stat">
              <span>{t('buyer.viewedTitle')}</span>
              <strong>{items.length}</strong>
            </div>
            <div className="buyer-viewed-stat">
              <span>{t('buyer.purchasesTotal')}</span>
              <strong>{total.toFixed(0)} ₽</strong>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="buyer-empty">
              {loading ? <RefreshCw size={32} className="spin-icon" /> : <Inbox size={32} />}
              <p>{loading ? t('layout.loadingProfile') : t('buyer.viewedEmpty')}</p>
            </div>
          ) : (
            <div className="buyer-viewed-list">
              {items.map((item) => {
                const visual = getCategoryVisual(item.category)
                const Icon = visual.icon

                return (
                  <article key={item.item_id} className="buyer-viewed-row">
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

                    <a
                      className="buyer-listing-link"
                      href={`https://lzt.market/${item.item_id}`}
                      target="_blank"
                      rel="noreferrer"
                      title={t('buyer.openOnMarket')}
                    >
                      <ExternalLink size={14} />
                    </a>
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
