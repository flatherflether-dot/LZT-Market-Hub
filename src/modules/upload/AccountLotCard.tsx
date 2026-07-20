import clsx from 'clsx'
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  MoreHorizontal,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import type { MarketItem } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { isUploadHistoryFailure, isUploadHistorySuccess } from '@core/upload-status'
import type { UploadHistoryEntry } from '@renderer/types/database'
import { getCategoryVisual } from './category-visuals'

interface AccountLotCardProps {
  row: UploadHistoryEntry
  live?: MarketItem
  checked: boolean
  inventoryValue?: number | null
  onOpen: () => void
  onToggleCheck: () => void
  onBump?: () => void
  onCheck?: () => void
}

function marketUrl(itemId: number): string {
  return `https://lzt.market/${itemId}`
}

export function AccountLotCard({
  row,
  live,
  checked,
  inventoryValue,
  onOpen,
  onToggleCheck,
  onBump,
  onCheck
}: AccountLotCardProps): React.ReactNode {
  const { t } = useTranslation()
  const visual = getCategoryVisual(row.category)
  const Icon = visual.icon
  const title = live?.title?.trim() || row.login
  const success = isUploadHistorySuccess(row.status)
  const failed = isUploadHistoryFailure(row.status)
  const hasAvatar = Boolean(live?.account_avatar)
  const displayPrice = live?.price ?? row.current_price ?? row.initial_price
  const priceChanged =
    row.initial_price != null &&
    displayPrice != null &&
    Math.round(row.initial_price) !== Math.round(displayPrice)

  return (
    <article className={clsx('lot-card', checked && 'lot-card-checked')} onClick={onOpen}>
      <label className="lot-card-select" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          disabled={!row.item_id}
          onChange={onToggleCheck}
          aria-label={t('upload.accountsSelectAll')}
        />
      </label>

      <div className="lot-card-cover" style={{ background: visual.gradient }}>
        {hasAvatar && (
          <>
            <div className="lot-card-cover-blur" style={{ backgroundImage: `url(${live!.account_avatar})` }} />
            <img src={live!.account_avatar} alt="" className="lot-card-avatar" />
          </>
        )}
        {!hasAvatar && (
          <div className="lot-card-icon-wrap">
            {visual.logoUrl ? (
              <img src={visual.logoUrl} alt={visual.label} style={{ width: 36, height: 36, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            ) : (
              <Icon size={36} strokeWidth={1.5} />
            )}
          </div>
        )}
        {displayPrice != null && displayPrice > 0 && (
          <div className="lot-card-price">{displayPrice.toLocaleString('ru-RU')} ₽</div>
        )}
        <div className="lot-card-cat-badge">{visual.label}</div>
      </div>

      <div className="lot-card-body">
        <h3 className="lot-card-title" title={title}>{title}</h3>
        <div className="lot-card-login">{row.login}</div>

        <div className="lot-card-tags">
          {success && (
            <span className="lot-tag lot-tag-ok">
              <CheckCircle2 size={12} /> {t('status.success')}
            </span>
          )}
          {failed && <span className="lot-tag lot-tag-err">{row.status}</span>}
          {!success && !failed && <span className="lot-tag">{row.status}</span>}
          {live?.item_state && <span className="lot-tag lot-tag-muted">{live.item_state}</span>}
          {priceChanged && row.initial_price != null && (
            <span className="lot-tag lot-tag-muted" title={t('upload.accountsInitialPrice')}>
              {row.initial_price.toLocaleString('ru-RU')} → {displayPrice!.toLocaleString('ru-RU')} ₽
            </span>
          )}
          {inventoryValue != null && inventoryValue > 0 && (
            <span className="lot-tag lot-tag-inv">
              <TrendingUp size={12} /> {inventoryValue.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </div>

      <div className="lot-card-footer">
        <span className="lot-card-date">
          {row.item_id ? `#${row.item_id}` : new Date(row.created_at).toLocaleDateString()}
        </span>
        <div className="lot-card-actions" onClick={(e) => e.stopPropagation()}>
          {row.item_id && onCheck && (
            <Button size="sm" variant="ghost" className="lot-card-action-btn" onClick={onCheck} title={t('upload.accountsCheckValid')}>
              <CheckCircle2 size={14} />
            </Button>
          )}
          {row.item_id && onBump && (
            <Button size="sm" variant="ghost" className="lot-card-action-btn" onClick={onBump} title={t('upload.accountsBump')}>
              <Zap size={14} />
            </Button>
          )}
          {row.item_id && (
            <Button
              size="sm"
              variant="ghost"
              className="lot-card-action-btn"
              onClick={() => window.open(marketUrl(row.item_id!), '_blank')}
              title={t('analytics.openOnMarket')}
            >
              <ExternalLink size={14} />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="lot-card-action-btn" onClick={onOpen} title={t('upload.accountsDetailTitle')}>
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      <div className="lot-card-open-hint">
        <ArrowUpRight size={14} />
      </div>
    </article>
  )
}
