import clsx from 'clsx'
import { Bell, Eye, Inbox, Plus, Trash2 } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { formatMarketText } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import type { WatchlistItem } from '@renderer/types/database'

export interface BuyerWatchlistPanelProps {
  watchItemId: string
  setWatchItemId: (v: string) => void
  targetPrice: string
  setTargetPrice: (v: string) => void
  onAdd: () => void
}

export function BuyerWatchlistPanel(props: BuyerWatchlistPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const canAdd = Boolean(props.watchItemId.trim())

  return (
    <div className="buyer-watchlist-panel">
      <header className="buyer-watchlist-panel-head">
        <Plus size={18} />
        <div>
          <h3>{t('buyer.addWatchlist')}</h3>
          <p>{t('buyer.addWatchlistDesc')}</p>
        </div>
      </header>

      <div className="buyer-watchlist-panel-body">
        <Input
          label={t('common.itemId')}
          type="number"
          value={props.watchItemId}
          onChange={(e) => props.setWatchItemId(e.target.value)}
        />
        <Input
          label={t('buyer.alertBelow')}
          type="number"
          value={props.targetPrice}
          onChange={(e) => props.setTargetPrice(e.target.value)}
          hint={t('buyer.alertBelowHint')}
        />
        <Button
          variant="primary"
          className="buyer-watchlist-add-btn"
          onClick={() => void props.onAdd()}
          disabled={!canAdd}
        >
          <Bell size={16} />
          {t('buyer.addWatchlist')}
        </Button>
      </div>
    </div>
  )
}

export interface BuyerWatchlistTabProps {
  watchlist: WatchlistItem[]
  onRemove: (itemId: number) => void
}

export function BuyerWatchlistTab(props: BuyerWatchlistTabProps): React.ReactNode {
  const { t } = useTranslation()
  const alertCount = props.watchlist.filter((w) => w.target_price != null).length
  const triggeredCount = props.watchlist.filter(
    (w) => w.target_price != null && w.price != null && w.price <= w.target_price
  ).length

  return (
    <div className="buyer-hub">
      <section className="buyer-section buyer-watchlist-card">
        <header className="buyer-section-head buyer-section-head-stack">
          <div>
            <h3>
              <Eye size={16} />
              {t('buyer.watchlistTitle')}
            </h3>
            <p className="buyer-section-desc">{t('buyer.watchlistDesc')}</p>
          </div>
          <span className="buyer-section-count">{props.watchlist.length}</span>
        </header>

        <div className="buyer-watchlist-body">
          <div className="buyer-watchlist-stats">
            <div className="buyer-watchlist-stat">
              <span>{t('buyer.watchlistTitle')}</span>
              <strong>{props.watchlist.length}</strong>
            </div>
            <div className="buyer-watchlist-stat">
              <span>{t('buyer.alertBelow')}</span>
              <strong>{alertCount}</strong>
            </div>
            <div className={clsx('buyer-watchlist-stat', triggeredCount > 0 && 'is-alert')}>
              <span>{t('buyer.alertsTriggered')}</span>
              <strong>{triggeredCount}</strong>
            </div>
          </div>

          {props.watchlist.length === 0 ? (
            <div className="buyer-empty">
              <Inbox size={32} />
              <p>{t('buyer.noWatchlist')}</p>
            </div>
          ) : (
            <div className="buyer-watchlist-list">
              {props.watchlist.map((item) => {
                const triggered =
                  item.target_price != null && item.price != null && item.price <= item.target_price
                const title = formatMarketText(item.title) || `#${item.item_id}`

                return (
                  <article
                    key={item.id}
                    className={clsx('buyer-watchlist-row', triggered && 'is-triggered')}
                  >
                    <div className="buyer-watchlist-icon">
                      <Bell size={16} />
                    </div>

                    <div className="buyer-watchlist-item-body">
                      <div className="buyer-watchlist-item-head">
                        <a
                          className="buyer-listing-title"
                          href={`https://lzt.market/${item.item_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {title}
                        </a>
                        {item.price != null && (
                          <span className="buyer-listing-price">{item.price} ₽</span>
                        )}
                      </div>
                      <div className="buyer-watchlist-item-meta">
                        <span>#{item.item_id}</span>
                        {item.target_price != null ? (
                          <span className={clsx('buyer-watchlist-alert', triggered && 'is-triggered')}>
                            <Bell size={12} />
                            {t('buyer.alertBelow')} {item.target_price} ₽
                          </span>
                        ) : (
                          <span className="buyer-watchlist-no-alert">{t('buyer.noAlertSet')}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void props.onRemove(item.item_id)}
                    >
                      <Trash2 size={14} />
                      {t('common.delete')}
                    </Button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
