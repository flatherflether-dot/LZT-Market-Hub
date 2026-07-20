import {
  CreditCard,
  Save,
  ShoppingCart,
  Trash2,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { type MarketItem } from '@core/constants'
import { formatMarketText } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { getCategoryVisual } from '../upload/category-visuals'

type CartCheckoutMode = 'confirm' | 'safe'

export interface BuyerCartCheckoutPanelProps {
  cartCheckoutMode: CartCheckoutMode
  setCartCheckoutMode: (mode: CartCheckoutMode) => void
  cartMaxTotal: string
  setCartMaxTotal: (v: string) => void
  cartMaxItems: string
  setCartMaxItems: (v: string) => void
  onSave: () => void
}

export function BuyerCartCheckoutPanel(props: BuyerCartCheckoutPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="buyer-cart-panel">
      <header className="buyer-cart-panel-head">
        <CreditCard size={18} />
        <div>
          <h3>{t('buyer.batchCheckoutTitle')}</h3>
          <p>{t('buyer.batchCheckoutDesc')}</p>
        </div>
      </header>

      <div className="buyer-cart-panel-body">
        <Select
          label={t('buyer.checkoutMode')}
          value={props.cartCheckoutMode}
          onChange={(e) => props.setCartCheckoutMode(e.target.value as CartCheckoutMode)}
          options={[
            { value: 'confirm', label: t('buyer.checkoutConfirm') },
            { value: 'safe', label: t('buyer.checkoutSafe') }
          ]}
        />
        <div className="buyer-cart-hint">
          {props.cartCheckoutMode === 'confirm'
            ? t('buyer.checkoutConfirmHint')
            : t('buyer.checkoutSafeHint')}
        </div>
        <div className="buyer-cart-limits">
          <Input
            label={t('buyer.cartMaxTotal')}
            type="number"
            value={props.cartMaxTotal}
            onChange={(e) => props.setCartMaxTotal(e.target.value)}
          />
          <Input
            label={t('buyer.cartMaxItems')}
            type="number"
            value={props.cartMaxItems}
            onChange={(e) => props.setCartMaxItems(e.target.value)}
          />
        </div>
        <p className="buyer-cart-footnote">{t('buyer.batchCheckoutHint')}</p>
        <Button size="sm" className="full buyer-cart-save-btn" variant="secondary" onClick={() => void props.onSave()}>
          <Save size={14} />
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

export interface BuyerCartTabProps {
  cartItems: MarketItem[]
  buyingId: number | null
  batchCheckingOut: boolean
  onBatchCheckout: () => void
  onClear: () => void
  onBuy: (item: MarketItem) => void
}

export function BuyerCartTab(props: BuyerCartTabProps): React.ReactNode {
  const { t } = useTranslation()
  const total = props.cartItems.reduce((sum, item) => sum + (item.price ?? 0), 0)

  return (
    <div className="buyer-hub">
      <section className="buyer-section buyer-cart-card">
        <header className="buyer-cart-head">
          <div className="buyer-cart-head-main">
            <div className="buyer-cart-head-icon">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3>{t('buyer.cart')}</h3>
              <p>{t('buyer.cartDesc')}</p>
            </div>
          </div>
          <div className="buyer-cart-toolbar">
            <Button
              size="sm"
              variant="primary"
              className="buyer-cart-checkout-all"
              onClick={() => void props.onBatchCheckout()}
              disabled={!props.cartItems.length || props.batchCheckingOut}
            >
              <Zap size={14} />
              {props.batchCheckingOut ? '…' : t('buyer.batchCheckout')}
            </Button>
            <Button size="sm" variant="secondary" className="buyer-cart-toolbar-btn" onClick={() => void props.onClear()} disabled={!props.cartItems.length}>
              <Trash2 size={14} />
              {t('common.clear')}
            </Button>
          </div>
        </header>

        <div className="buyer-cart-body">
          <div className="buyer-cart-stats">
            <div className="buyer-cart-stat">
              <span>{t('buyer.cart')}</span>
              <strong>{props.cartItems.length}</strong>
            </div>
            <div className="buyer-cart-stat is-total">
              <span>{t('buyer.cartTotal')}</span>
              <strong>{total.toFixed(0)} ₽</strong>
            </div>
          </div>

          {props.cartItems.length === 0 ? (
            <div className="buyer-empty">
              <ShoppingCart size={32} />
              <p>{t('buyer.cartEmpty')}</p>
            </div>
          ) : (
            <div className="buyer-cart-list">
              {props.cartItems.map((item) => {
                const visual = getCategoryVisual(item.category)
                const Icon = visual.icon

                return (
                  <article key={item.item_id} className="buyer-cart-row">
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

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => void props.onBuy(item)}
                      disabled={props.buyingId === item.item_id}
                    >
                      {props.buyingId === item.item_id ? '…' : t('common.buy')}
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
