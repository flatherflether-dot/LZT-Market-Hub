import { ExternalLink, Inbox, ShoppingCart, Star } from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { type MarketItem } from '@core/constants'
import { formatMarketText } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { getCategoryVisual } from '../upload/category-visuals'

export interface BuyerMonitorTabProps {
  latestItems: MarketItem[]
  buyingId: number | null
  onFastBuy: (item: MarketItem) => void
  onAddToCart: (item: MarketItem) => void
  onAddFavorite: (item: MarketItem) => void
  defaultCategory: string
}

export function BuyerMonitorTab(props: BuyerMonitorTabProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="buyer-hub">
      <Card
        title={t('buyer.latestListings')}
        className="settings-form-card card-main buyer-listings-card"
        actions={<span className="buyer-section-count">{props.latestItems.length}</span>}
      >
        {props.latestItems.length === 0 ? (
          <div className="buyer-empty buyer-empty-compact">
            <Inbox size={28} />
            <p>{t('buyer.emptyListings')}</p>
          </div>
        ) : (
          <ul className="buyer-listing-list">
            {props.latestItems.map((item) => {
              const visual = getCategoryVisual(item.category ?? props.defaultCategory)
              const Icon = visual.icon
              return (
                <li
                  key={item.item_id}
                  className="buyer-listing-item"
                  style={{ '--listing-accent': visual.accent } as React.CSSProperties}
                >
                  <div className="buyer-listing-icon" style={{ background: visual.gradient }}>
                    {visual.logoUrl ? (
                      <img src={visual.logoUrl} alt="" className="buyer-listing-logo" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>

                  <div className="buyer-listing-body">
                    <a
                      className="buyer-listing-title"
                      href={`https://lzt.market/${item.item_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {formatMarketText(item.title) || `#${item.item_id}`}
                    </a>
                    <div className="buyer-listing-meta">
                      <span className="buyer-listing-id">#{item.item_id}</span>
                      <span>{visual.label}</span>
                    </div>
                  </div>

                  <span className="buyer-listing-price">{item.price} ₽</span>

                  <div className="buyer-listing-actions">
                    <Button
                      size="sm"
                      onClick={() => void props.onFastBuy(item)}
                      disabled={props.buyingId === item.item_id}
                    >
                      {props.buyingId === item.item_id ? '…' : t('common.buy')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void props.onAddToCart(item)}
                      title={t('buyer.cart')}
                    >
                      <ShoppingCart size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void props.onAddFavorite(item)}
                      title={t('buyer.favoriteTitle')}
                    >
                      <Star size={14} />
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
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
