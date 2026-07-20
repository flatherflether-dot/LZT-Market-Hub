import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  AlertCircle,
  ExternalLink,
  PackageOpen,
  TrendingUp,
  Upload,
  X
} from 'lucide-react'
import { Button } from '@components/Button'
import { ItemDetailTagsPanel } from '@components/ItemDetailTagsPanel'
import { ItemLotToolsPanel } from '@components/ItemLotToolsPanel'
import { getApiClient } from '@core/api-client'
import type { MarketItem, MarketItemDetailResponse } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'
import { mergeItemDetail, parseItemDetailResponse, resolveItemPrice } from '@core/item-detail'
import { isUploadHistoryFailure, isUploadHistorySuccess } from '@core/upload-status'
import type { UploadHistoryEntry } from '@renderer/types/database'
import { getCategoryVisual } from './category-visuals'
import { ItemDetailEditTab } from './ItemDetailEditTab'
import { ItemDetailOverviewTab } from './ItemDetailOverviewTab'

type ModalTab = 'overview' | 'edit' | 'tools' | 'tags' | 'inventory'

interface AccountLotModalProps {
  entry: UploadHistoryEntry
  live?: MarketItem
  onClose: () => void
  onPriceSaved: (itemId: number, price: number) => void
  onGoToUpload?: () => void
}

function marketUrl(itemId: number): string {
  return `https://lzt.market/${itemId}`
}

export function AccountLotModal({
  entry,
  live,
  onClose,
  onPriceSaved,
  onGoToUpload
}: AccountLotModalProps): React.ReactNode {
  const { t } = useTranslation()
  const visual = getCategoryVisual(entry.category)
  const Icon = visual.icon
  const itemId = entry.item_id
  const isSteam = visual.id === 'steam'

  const [tab, setTab] = useState<ModalTab>('overview')
  const [detail, setDetail] = useState<MarketItemDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [inventoryValue, setInventoryValue] = useState<number | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)

  const item = mergeItemDetail(live, detail?.item)
  const initialPrice = entry.initial_price
  const currentPrice = resolveItemPrice(item, entry.current_price ?? entry.initial_price ?? live?.price)
  const priceChanged =
    initialPrice != null && currentPrice != null && Math.round(initialPrice) !== Math.round(currentPrice)

  const loadDetail = useCallback(async (silent = false): Promise<void> => {
    if (!itemId) return
    if (!silent) setLoadingDetail(true)
    try {
      const { data } = await getApiClient().getItem(itemId)
      setDetail(parseItemDetailResponse(data))
    } catch {
      if (!silent) setDetail(null)
    } finally {
      if (!silent) setLoadingDetail(false)
    }
  }, [itemId])

  useEffect(() => {
    if (!itemId) return
    void loadDetail(false)
  }, [itemId, loadDetail])

  useAutoRefresh(() => loadDetail(true), [loadDetail], undefined, Boolean(itemId))

  const loadInventory = useCallback(async (refresh: boolean, silent = false): Promise<void> => {
    if (!itemId) return
    if (!silent) setInventoryLoading(true)
    try {
      const { data } = refresh
        ? await getApiClient().updateSteamInventoryValue(itemId)
        : await getApiClient().getSteamInventoryValue(itemId)
      setInventoryValue(data.value ?? data.inventory_value ?? data.steam_inventory_value ?? null)
    } catch {
      if (!silent) setInventoryValue(null)
    } finally {
      if (!silent) setInventoryLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    if (!itemId || !isSteam || tab !== 'inventory') return
    void loadInventory(false, false)
  }, [itemId, isSteam, tab, loadInventory])

  useAutoRefresh(
    () => loadInventory(true, true),
    [loadInventory],
    undefined,
    Boolean(itemId && isSteam && tab === 'inventory')
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = item?.title?.trim() || live?.title?.trim() || entry.login
  const success = isUploadHistorySuccess(entry.status)
  const failed = isUploadHistoryFailure(entry.status)
  const hasInventoryItems = (item?.inventory?.length ?? live?.inventory?.length ?? 0) > 0
  const showInventoryTab = Boolean(itemId && isSteam)

  const tabs: Array<{ id: ModalTab; label: string; hidden?: boolean }> = [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'edit', label: t('itemDetail.editTab'), hidden: !itemId },
    { id: 'tools', label: t('itemTools.title'), hidden: !itemId },
    { id: 'tags', label: t('tabs.tags'), hidden: !itemId },
    { id: 'inventory', label: t('itemTools.steamInvValue'), hidden: !showInventoryTab }
  ]

  function handleGoToUpload(): void {
    onClose()
    onGoToUpload?.()
  }

  return (
    <div className="lot-modal-overlay" onClick={onClose} role="presentation">
      <div className="lot-modal lot-modal-unified-layout" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="lot-modal-hero" style={{ background: visual.gradient }}>
          <div className="lot-modal-hero-bg">
            {(item?.account_avatar ?? live?.account_avatar) && (
              <div
                className="lot-modal-hero-blur"
                style={{ backgroundImage: `url(${item?.account_avatar ?? live?.account_avatar})` }}
              />
            )}
          </div>
          <button type="button" className="lot-modal-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>

          <div className="lot-modal-hero-content">
            {(item?.account_avatar ?? live?.account_avatar) ? (
              <img src={item?.account_avatar ?? live?.account_avatar} alt="" className="lot-modal-hero-avatar" />
            ) : visual.logoUrl ? (
              <div className="lot-modal-hero-icon">
                <img src={visual.logoUrl} alt={visual.label} className="lot-modal-hero-logo" />
              </div>
            ) : (
              <div className="lot-modal-hero-icon">
                <Icon size={40} strokeWidth={1.5} />
              </div>
            )}
            <div className="lot-modal-hero-text">
              <h2 className="lot-modal-hero-title">{title}</h2>
              <div className="lot-modal-hero-meta">
                {currentPrice != null && (
                  <span className="lot-tag lot-tag-price">
                    {currentPrice.toLocaleString('ru-RU')} ₽
                    {priceChanged && initialPrice != null && (
                      <span className="lot-tag-price-old">{initialPrice.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </span>
                )}
                <span className="lot-tag">{visual.label}</span>
                {(item?.game_title ?? live?.game_title) && (
                  <span className="lot-tag lot-tag-muted">{item?.game_title ?? live?.game_title}</span>
                )}
                {item?.item_state && <span className="lot-tag lot-tag-muted">{item.item_state}</span>}
                {success && <span className="lot-tag lot-tag-ok">{t('status.success')}</span>}
                {failed && <span className="lot-tag lot-tag-err">{entry.status}</span>}
                {itemId && (
                  <a href={marketUrl(itemId)} target="_blank" rel="noreferrer" className="lot-modal-market-link">
                    <ExternalLink size={14} /> #{itemId}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lot-modal-tabs">
          <div className="lot-modal-tabs-list">
            {tabs.filter((row) => !row.hidden).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={clsx('lot-modal-tab', tab === id && 'active')}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="lot-modal-body">
          {!itemId && (
            <div className="lot-modal-alert">
              <AlertCircle size={20} />
              <div className="lot-modal-alert-text">
                <strong>{t('upload.accountsNoLotTitle')}</strong>
                <p>{entry.message || t('upload.accountsNoLotHint')}</p>
              </div>
              {onGoToUpload && (
                <Button size="sm" onClick={handleGoToUpload}>
                  <Upload size={14} /> {t('upload.accountsGoToUpload')}
                </Button>
              )}
            </div>
          )}

          {loadingDetail && itemId && tab === 'overview' && !detail && (
            <p className="lot-modal-muted lot-modal-loading">{t('layout.loadingProfile')}</p>
          )}

          {tab === 'overview' && (
            <ItemDetailOverviewTab
              entry={entry}
              detail={detail ?? undefined}
              initialPrice={initialPrice}
              currentPrice={currentPrice}
              priceChanged={priceChanged}
            />
          )}

          {tab === 'edit' && itemId && (
            <ItemDetailEditTab
              itemId={itemId}
              detail={detail ?? undefined}
              onSaved={onPriceSaved}
              onRefresh={() => loadDetail(false)}
            />
          )}

          {tab === 'tools' && itemId && (
            <div className="lot-modal-tab-pane">
              <ItemLotToolsPanel
                itemId={itemId}
                inModal
                showMarketChecks
                showListingActions
              />
            </div>
          )}

          {tab === 'tags' && itemId && (
            <ItemDetailTagsPanel itemId={itemId} item={item} onChanged={() => loadDetail(false)} />
          )}

          {tab === 'inventory' && showInventoryTab && (
            <div className="lot-modal-tab-pane lot-inventory-panel">
              <div className="lot-inv-banner">
                <TrendingUp size={24} />
                <div>
                  <span>{t('analytics.inventoryValue')}</span>
                  {inventoryLoading ? (
                    <strong>{t('layout.loadingProfile')}</strong>
                  ) : inventoryValue != null ? (
                    <strong>{inventoryValue.toLocaleString('ru-RU')} ₽</strong>
                  ) : (
                    <strong>{t('common.noData')}</strong>
                  )}
                </div>
              </div>

              {hasInventoryItems ? (
                <div className="lot-inventory-grid">
                  {(item?.inventory ?? live?.inventory ?? []).map((invItem, idx) => (
                    <div key={idx} className="lot-inventory-item" title={invItem.title}>
                      {invItem.image ? <img src={invItem.image} alt="" /> : <div className="lot-inventory-placeholder" />}
                      <span className="lot-inventory-item-title">{invItem.title}</span>
                      {invItem.price != null && <span className="lot-inventory-item-price">{invItem.price} ₽</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="lot-inventory-empty">
                  <PackageOpen size={40} strokeWidth={1.2} />
                  <p>{inventoryLoading ? t('upload.accountsChecking') : t('common.noData')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
