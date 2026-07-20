import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import {
  BadgePercent,
  Inbox,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { CustomDiscount, MarketItem } from '@core/constants'
import { extractDiscountRequest } from '@core/batch-helper'
import { formatMarketText } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { getCategoryVisual } from '../upload/category-visuals'

interface PendingDiscount {
  item: MarketItem
  requestedPrice: number
  discountId?: number
  username?: string
}

function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export function DiscountsTab(): React.ReactNode {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingDiscount[]>([])
  const [customDiscounts, setCustomDiscounts] = useState<CustomDiscount[]>([])
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [autoAiPercent, setAutoAiPercent] = useState('10')
  const [customTitle, setCustomTitle] = useState('')
  const [customPercent, setCustomPercent] = useState('5')
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const client = getApiClient()
      const { data: prof } = await client.getProfile<{ user?: { user_id: number } }>()
      if (!prof.user?.user_id) return

      const [{ data: itemsData }, { data: customData }] = await Promise.all([
        client.getMyItems<{ items?: MarketItem[] }>(prof.user.user_id, { page: 1 }),
        client.getCustomDiscounts()
      ])

      const items = itemsData.items ?? []
      const list: PendingDiscount[] = []
      for (const item of items) {
        const req = extractDiscountRequest(item)
        if (!req) continue
        const requestedPrice = req.requested_price ?? req.requestedPrice ?? req.price ?? 0
        list.push({
          item,
          requestedPrice,
          discountId: req.discount_id ?? req.discountId,
          username: req.username
        })
      }
      setPending(list)
      setCustomDiscounts(customData.discounts ?? [])

      const autoOn = (await window.api.db.getSetting('discount_auto_enabled')) === '1'
      const autoPct = await window.api.db.getSetting('discount_auto_ai_percent')
      setAutoEnabled(autoOn)
      if (autoPct) setAutoAiPercent(autoPct)

      if (autoOn && list.length) {
        await tryAutoApprove(list, Number(autoPct) || 10)
      }
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

  async function tryAutoApprove(list: PendingDiscount[], maxDropPercent: number): Promise<void> {
    const client = getApiClient()
    for (const row of list) {
      try {
        const { data: ai } = await client.getAiPrice(row.item.item_id)
        const aiPrice = ai.price
        if (!aiPrice) continue
        const drop = ((row.item.price - row.requestedPrice) / row.item.price) * 100
        const aiDrop = ((aiPrice - row.requestedPrice) / aiPrice) * 100
        if (drop <= maxDropPercent && row.requestedPrice >= aiPrice * (1 - maxDropPercent / 100)) {
          await client.reviewDiscountRequest(row.item.item_id, true, row.discountId)
          notify(t('buyer.discountsTitle'), t('buyer.discountAutoApproved', { id: row.item.item_id }), 'success')
        } else if (aiDrop <= maxDropPercent) {
          await client.reviewDiscountRequest(row.item.item_id, true, row.discountId)
        }
      } catch {

      }
    }
  }

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  async function saveAutoSettings(): Promise<void> {
    await window.api.db.setSetting('discount_auto_enabled', autoEnabled ? '1' : '0')
    await window.api.db.setSetting('discount_auto_ai_percent', autoAiPercent)
    setStatus(t('buyer.discountAutoSaved'))
    setStatusKind('success')
  }

  async function review(itemId: number, approve: boolean, discountId?: number): Promise<void> {
    try {
      await getApiClient().reviewDiscountRequest(itemId, approve, discountId)
      setStatus(approve ? t('buyer.discountApproved') : t('buyer.discountDeclined'))
      setStatusKind('success')
      await refresh(false)
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    }
  }

  async function createCustom(): Promise<void> {
    if (!customTitle.trim()) return
    try {
      await getApiClient().createCustomDiscount({
        title: customTitle.trim(),
        percent: Number(customPercent) || 5
      })
      setCustomTitle('')
      await refresh(false)
      setStatus(t('buyer.customDiscountCreated'))
      setStatusKind('success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    }
  }

  async function deleteCustom(id: number): Promise<void> {
    try {
      await getApiClient().deleteCustomDiscount(id)
      await refresh(false)
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    }
  }

  return (
    <div className="buyer-hub">
      <section className="buyer-section buyer-discounts-card">
        <header className="buyer-discounts-head">
          <div className="buyer-discounts-head-main">
            <div className="buyer-discounts-head-icon">
              <BadgePercent size={18} />
            </div>
            <div>
              <h3>{t('buyer.discountsTitle')}</h3>
              <p>{t('buyer.discountsDesc')}</p>
            </div>
          </div>
        </header>

        <div className="buyer-discounts-body">
          <div className="buyer-discounts-stats">
            <div className="buyer-discounts-stat is-pending">
              <span>{t('buyer.discountsTitle')}</span>
              <strong>{pending.length}</strong>
            </div>
            <div className="buyer-discounts-stat">
              <span>{t('buyer.customDiscountsTitle')}</span>
              <strong>{customDiscounts.length}</strong>
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="buyer-empty">
              {loading ? <RefreshCw size={32} className="spin-icon" /> : <Inbox size={32} />}
              <p>{loading ? t('layout.loadingProfile') : t('buyer.discountsEmpty')}</p>
            </div>
          ) : (
            <div className="buyer-discounts-list">
              {pending.map((row) => {
                const visual = getCategoryVisual(row.item.category)
                const Icon = visual.icon
                const drop =
                  row.item.price > 0
                    ? Math.round(((row.item.price - row.requestedPrice) / row.item.price) * 100)
                    : 0

                return (
                  <article key={row.item.item_id} className="buyer-discounts-row">
                    <div className="buyer-listing-icon" style={{ background: visual.gradient }}>
                      {visual.logoUrl ? (
                        <img src={visual.logoUrl} alt="" className="buyer-listing-logo" />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>

                    <div className="buyer-listing-body">
                      <div className="buyer-listing-head">
                        <span className="buyer-listing-title">
                          {formatMarketText(row.item.title) || `#${row.item.item_id}`}
                        </span>
                        <span className="buyer-listing-price">{row.item.price} ₽</span>
                      </div>
                      <div className="buyer-listing-meta">
                        <span>#{row.item.item_id}</span>
                        <span>{row.username ?? t('buyer.requestedBy')}</span>
                      </div>
                      <div className="buyer-discounts-row-prices">
                        <span>{t('buyer.requestedPrice')}:</span>
                        <strong>{row.requestedPrice} ₽</strong>
                        {drop > 0 && <span>(−{drop}%)</span>}
                      </div>
                    </div>

                    <div className="buyer-discounts-row-actions">
                      <Button size="sm" onClick={() => void review(row.item.item_id, true, row.discountId)}>
                        {t('buyer.discountApprove')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void review(row.item.item_id, false, row.discountId)}
                      >
                        {t('buyer.discountDecline')}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="buyer-section buyer-discounts-auto-card">
        <header className="buyer-discounts-auto-head">
          <Sparkles size={16} />
          <h3>{t('buyer.discountAutoTitle')}</h3>
        </header>
        <div className="buyer-discounts-auto-body">
          <label className="buyer-discounts-toggle">
            <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoEnabled(e.target.checked)} />
            <span>{t('buyer.discountAutoEnabled')}</span>
          </label>
          <Input
            label={t('buyer.discountAutoAiPercent')}
            type="number"
            value={autoAiPercent}
            onChange={(e) => setAutoAiPercent(e.target.value)}
            hint={t('buyer.discountAutoHint')}
          />
          <Button size="sm" className="buyer-cart-save-btn" onClick={() => void saveAutoSettings()}>
            <Zap size={14} />
            {t('common.save')}
          </Button>
        </div>
      </section>

      <section className="buyer-section buyer-discounts-custom-card">
        <header className="buyer-discounts-custom-head">
          <Tag size={16} />
          <h3>{t('buyer.customDiscountsTitle')}</h3>
        </header>
        <div className="buyer-discounts-custom-body">
          <div className="buyer-discounts-custom-form">
            <Input label={t('common.name')} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            <Input
              label={t('buyer.customDiscountPercent')}
              type="number"
              value={customPercent}
              onChange={(e) => setCustomPercent(e.target.value)}
            />
            <Button size="sm" onClick={() => void createCustom()} disabled={!customTitle.trim()}>
              <Plus size={14} />
              {t('buyer.customDiscountCreate')}
            </Button>
          </div>

          {customDiscounts.length > 0 && (
            <div className="buyer-discounts-custom-list">
              {customDiscounts.map((d) => (
                <div key={d.discount_id} className="buyer-discounts-custom-row">
                  <div className="buyer-discounts-custom-row-info">
                    <strong>{d.title ?? d.discount_id}</strong>
                    <span className="buyer-discounts-custom-percent">{d.percent ?? '—'}%</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void deleteCustom(d.discount_id)}>
                    {t('common.delete')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
  )
}
