import clsx from 'clsx'
import { ArrowLeftRight, Info, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { UPLOAD_CURRENCIES } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { isTokenError } from './finance-utils'

const CURRENCY_OPTIONS = UPLOAD_CURRENCIES.map((c) => ({ value: c, label: c.toUpperCase() }))

export interface FinanceTransferTabProps {
  transferUser: string
  setTransferUser: (v: string) => void
  transferAmount: string
  setTransferAmount: (v: string) => void
  transferCurrency: string
  setTransferCurrency: (v: string) => void
  transferComment: string
  setTransferComment: (v: string) => void
  secretAnswer: string
  setSecretAnswer: (v: string) => void
  transferFee: number | null
  busy: boolean
  status: string | null
  onFetchFee: () => void
  onSubmit: () => void
}

export function FinanceTransferTab(props: FinanceTransferTabProps): React.ReactNode {
  const { t } = useTranslation()
  const canSubmit = Boolean(
    props.transferUser.trim() && props.transferAmount && props.secretAnswer && !props.busy
  )

  return (
    <div className="finance-hub">
      <section className="finance-section finance-transfer-card">
        <header className="finance-section-head">
          <div className="finance-section-head-main">
            <div className="finance-section-head-icon">
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h3>{t('finance.transferTitle')}</h3>
              <p>{t('finance.transferDesc')}</p>
            </div>
          </div>
        </header>

        <div className="finance-section-body">
          <div className="finance-transfer-grid">
            <Input
              label={t('finance.recipient')}
              value={props.transferUser}
              onChange={(e) => props.setTransferUser(e.target.value)}
              placeholder="username"
            />
            <Input
              label={t('common.amount')}
              type="number"
              value={props.transferAmount}
              onChange={(e) => props.setTransferAmount(e.target.value)}
            />
            <Select
              label={t('finance.currency')}
              value={props.transferCurrency}
              onChange={(e) => props.setTransferCurrency(e.target.value)}
              options={CURRENCY_OPTIONS}
            />
            <Input
              label={t('reseller.secretAnswer')}
              type="password"
              value={props.secretAnswer}
              onChange={(e) => props.setSecretAnswer(e.target.value)}
            />
          </div>

          <Input
            label={t('common.notes')}
            value={props.transferComment}
            onChange={(e) => props.setTransferComment(e.target.value)}
          />

          <div className="finance-transfer-hint">
            <Info size={14} />
            <span>{t('reseller.secretHint')}</span>
          </div>

          <div className="finance-transfer-actions">
            <Button
              variant="secondary"
              onClick={() => void props.onFetchFee()}
              disabled={props.busy || !props.transferUser || !props.transferAmount}
            >
              {t('finance.transferFee')}
            </Button>
            <Button
              className="finance-transfer-submit"
              onClick={() => void props.onSubmit()}
              disabled={!canSubmit}
            >
              <ArrowLeftRight size={14} />
              {t('finance.transferSubmit')}
            </Button>
          </div>

          {props.transferFee !== null && (
            <p className="finance-transfer-fee">{t('finance.transferFeeValue', { fee: props.transferFee })}</p>
          )}

          {props.status && (
            <div
              className={clsx(
                'finance-status-banner',
                !isTokenError(props.status) && 'is-success',
                isTokenError(props.status) && 'is-error'
              )}
            >
              <Zap size={14} />
              {isTokenError(props.status) ? t('layout.apiOfflineHint') : props.status}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
