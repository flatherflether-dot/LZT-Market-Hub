import { useEffect } from 'react'
import { Save, Search, X } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { CategorySearchBuilder } from '@components/CategorySearchBuilder'
import { useCategoryOptions, useTranslation } from '@core/i18n'

export interface BuyerFilterModalProps {
  open: boolean
  onClose: () => void
  isEditing: boolean
  name: string
  setName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  pmin: string
  setPmin: (v: string) => void
  pmax: string
  setPmax: (v: string) => void
  extraParams: Record<string, string | number | boolean>
  setExtraParams: (v: Record<string, string | number | boolean>) => void
  onSave: () => void | Promise<void>
  onPreview: () => void | Promise<void>
}

export function BuyerFilterModal(props: BuyerFilterModalProps): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()
  const paramCount = Object.keys(props.extraParams).length

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

  return (
    <div className="modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="modal-dialog modal-dialog-lg buyer-filter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-filter-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="buyer-filter-modal-title" className="modal-title">
              {props.isEditing ? t('buyer.editFilter') : t('buyer.newFilter')}
            </h2>
            <p className="modal-description">{t('buyer.watchFilterDesc')}</p>
          </div>
          <button type="button" className="modal-close" onClick={props.onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body buyer-filters-form">
          <Input
            label={t('common.name')}
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            placeholder={t('buyer.defaultFilterName')}
          />
          <Select
            label={t('common.category')}
            value={props.category}
            onChange={(e) => {
              props.setCategory(e.target.value)
              props.setExtraParams({})
            }}
            options={categoryOptions}
          />
          <div className="buyer-watch-prices">
            <Input
              label={t('buyer.minPrice')}
              type="number"
              value={props.pmin}
              onChange={(e) => props.setPmin(e.target.value)}
            />
            <Input
              label={t('buyer.maxPrice')}
              type="number"
              value={props.pmax}
              onChange={(e) => props.setPmax(e.target.value)}
            />
          </div>
          <CategorySearchBuilder
            category={props.category}
            value={props.extraParams}
            onChange={props.setExtraParams}
            compact
          />
          <span className="buyer-watch-param-count">
            {t('buyer.searchParamCount', { count: paramCount })}
          </span>
        </div>

        <div className="modal-footer buyer-filter-modal-footer">
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" onClick={() => void props.onPreview()}>
            <Search size={14} />
            {t('buyer.previewSearch')}
          </Button>
          <Button onClick={() => void props.onSave()} disabled={!props.name.trim()}>
            <Save size={14} />
            {props.isEditing ? t('common.save') : t('buyer.createFilter')}
          </Button>
        </div>
      </div>
    </div>
  )
}
