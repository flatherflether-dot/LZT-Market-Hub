import { useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { UPLOAD_CURRENCIES } from '@core/constants'
import { useTranslation } from '@core/i18n'

const CURRENCY_OPTIONS = UPLOAD_CURRENCIES.map((c) => ({ value: c, label: c.toUpperCase() }))

export interface FinanceAutoPayModalProps {
  open: boolean
  onClose: () => void
  autoPayUser: string
  setAutoPayUser: (v: string) => void
  autoPayAmount: string
  setAutoPayAmount: (v: string) => void
  autoPayCurrency: string
  setAutoPayCurrency: (v: string) => void
  autoPayComment: string
  setAutoPayComment: (v: string) => void
  busy: boolean
  onSubmit: () => void | Promise<void>
}

export function FinanceAutoPayModal(props: FinanceAutoPayModalProps): React.ReactNode {
  const { t } = useTranslation()
  const canSubmit = Boolean(props.autoPayUser.trim() && props.autoPayAmount && !props.busy)

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
        className="modal-dialog finance-auto-pay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-auto-pay-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="finance-auto-pay-modal-title" className="modal-title">
              {t('finance.autoPaymentCreate')}
            </h2>
            <p className="modal-description">{t('finance.autoPaymentModalDesc')}</p>
          </div>
          <button type="button" className="modal-close" onClick={props.onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body finance-auto-pay-form">
          <Input
            label={t('finance.recipient')}
            value={props.autoPayUser}
            onChange={(e) => props.setAutoPayUser(e.target.value)}
            placeholder="username"
          />
          <Input
            label={t('common.amount')}
            type="number"
            value={props.autoPayAmount}
            onChange={(e) => props.setAutoPayAmount(e.target.value)}
          />
          <Select
            label={t('finance.currency')}
            value={props.autoPayCurrency}
            onChange={(e) => props.setAutoPayCurrency(e.target.value)}
            options={CURRENCY_OPTIONS}
          />
          <Input
            label={t('common.notes')}
            value={props.autoPayComment}
            onChange={(e) => props.setAutoPayComment(e.target.value)}
          />
        </div>

        <div className="modal-footer finance-auto-pay-modal-footer">
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void props.onSubmit()} disabled={!canSubmit}>
            <Plus size={14} />
            {t('finance.autoPaymentCreate')}
          </Button>
        </div>
      </div>
    </div>
  )
}
