import { useEffect } from 'react'
import clsx from 'clsx'
import { Calculator, Sparkles, TrendingUp, X, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { useCategoryOptions, useTranslation } from '@core/i18n'

export interface ResellerMarginModalProps {
  open: boolean
  onClose: () => void
  category: string
  setCategory: (v: string) => void
  itemId: string
  setItemId: (v: string) => void
  buyPrice: string
  setBuyPrice: (v: string) => void
  sellPrice: string
  setSellPrice: (v: string) => void
  feePercent: string
  setFeePercent: (v: string) => void
  dealSource: string
  setDealSource: (v: string) => void
  parentDealId: string
  setParentDealId: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  netSell: number
  margin: number
  roi: string
  aiPriceHint: number | null
  onFetchAiPrice: () => void
  onSave: () => void | Promise<void>
  canSave: boolean
  autoDealEnabled: boolean
  onAutoDealChange: (enabled: boolean) => void
}

export function ResellerMarginModal(props: ResellerMarginModalProps): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()

  useEffect(() => {
    if (!props.open) return
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [props.open, props.onClose])

  if (!props.open) return null

  async function handleSave(): Promise<void> {
    await props.onSave()
    props.onClose()
  }

  return (
    <div className="modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="modal-dialog reseller-margin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reseller-margin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header reseller-margin-modal-head">
          <div className="reseller-margin-modal-head-text">
            <Calculator size={18} aria-hidden="true" />
            <div>
              <h2 id="reseller-margin-modal-title" className="modal-title">{t('reseller.marginCalc')}</h2>
              <p className="modal-description">{t('reseller.marginCalcDesc')}</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={props.onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body reseller-margin-modal-body">
          <label className={clsx('reseller-margin-auto', props.autoDealEnabled && 'is-on')}>
            <input
              type="checkbox"
              checked={props.autoDealEnabled}
              onChange={(e) => props.onAutoDealChange(e.target.checked)}
            />
            <Zap size={14} aria-hidden="true" />
            <span className="reseller-margin-auto-label">{t('reseller.autoDealEnabled')}</span>
            <span className={clsx('reseller-margin-auto-badge', props.autoDealEnabled && 'is-on')}>
              {props.autoDealEnabled ? t('reseller.autoDealOn') : t('reseller.autoDealOff')}
            </span>
          </label>

          <div className="reseller-margin-fields is-2">
            <Select
              label={t('common.category')}
              value={props.category}
              onChange={(e) => props.setCategory(e.target.value)}
              options={categoryOptions}
            />
            <Input
              label={t('common.itemId')}
              value={props.itemId}
              onChange={(e) => props.setItemId(e.target.value)}
              placeholder="123456789"
            />
          </div>

          {props.itemId && (
            <div className="reseller-margin-ai-row">
              <Button size="sm" variant="secondary" onClick={props.onFetchAiPrice}>
                <Sparkles size={13} />
                {t('upload.aiPriceFetch')}
              </Button>
              {props.aiPriceHint !== null && (
                <span className="form-hint">{t('upload.aiPriceHint', { price: props.aiPriceHint })}</span>
              )}
            </div>
          )}

          <div className="reseller-margin-fields is-3">
            <Input
              label={t('reseller.buyPriceRub')}
              type="number"
              value={props.buyPrice}
              onChange={(e) => props.setBuyPrice(e.target.value)}
              placeholder="0"
            />
            <Input
              label={t('reseller.sellPriceRub')}
              type="number"
              value={props.sellPrice}
              onChange={(e) => props.setSellPrice(e.target.value)}
              placeholder="0"
            />
            <Input
              label={t('reseller.marketFeeShort')}
              type="number"
              value={props.feePercent}
              onChange={(e) => props.setFeePercent(e.target.value)}
              placeholder="5"
            />
          </div>

          <div className="reseller-margin-fields is-2">
            <Select
              label={t('reseller.dealSource')}
              value={props.dealSource}
              onChange={(e) => props.setDealSource(e.target.value)}
              options={[
                { value: 'flip', label: t('reseller.sourceFlip') },
                { value: 'transfer', label: t('reseller.sourceTransfer') },
                { value: 'wholesale', label: t('reseller.sourceWholesale') }
              ]}
            />
            <Input
              label={t('reseller.dealChains')}
              value={props.parentDealId}
              onChange={(e) => props.setParentDealId(e.target.value)}
              placeholder={t('reseller.parentDealOptional')}
            />
          </div>

          <Input
            label={t('common.notes')}
            value={props.notes}
            onChange={(e) => props.setNotes(e.target.value)}
            placeholder={t('reseller.notesPlaceholder')}
          />

          <div className="reseller-margin-result">
            <div className="reseller-margin-result-item">
              <span>{t('common.net')}</span>
              <strong>{props.netSell.toFixed(0)} ₽</strong>
            </div>
            <div className={clsx('reseller-margin-result-item is-highlight', props.margin >= 0 ? 'is-positive' : 'is-negative')}>
              <span>{t('common.margin')}</span>
              <strong>{props.margin >= 0 ? '+' : ''}{props.margin.toFixed(0)} ₽</strong>
            </div>
            <div className="reseller-margin-result-item">
              <span>{t('common.roi')}</span>
              <strong>{props.roi}%</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={props.onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void handleSave()} disabled={!props.canSave}>
            <TrendingUp size={15} />
            {t('reseller.saveDeal')}
          </Button>
        </div>
      </div>
    </div>
  )
}
