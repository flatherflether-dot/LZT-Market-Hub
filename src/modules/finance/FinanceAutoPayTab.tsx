import clsx from 'clsx'
import { Inbox, Plus, RefreshCw, Repeat, Trash2, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import type { AutoPayment } from '@core/constants'
import { formatCurrencyAmount } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { FinanceAutoPayModal } from './FinanceAutoPayModal'
import { isTokenError } from './finance-utils'

export interface FinanceAutoPayTabProps {
  autoPayments: AutoPayment[]
  loading: boolean
  busy: boolean
  status: string | null
  error: string | null
  modalOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
  autoPayUser: string
  setAutoPayUser: (v: string) => void
  autoPayAmount: string
  setAutoPayAmount: (v: string) => void
  autoPayCurrency: string
  setAutoPayCurrency: (v: string) => void
  autoPayComment: string
  setAutoPayComment: (v: string) => void
  onCreate: () => void | Promise<void>
  onRemove: (id: number) => void | Promise<void>
}

export function FinanceAutoPayTab(props: FinanceAutoPayTabProps): React.ReactNode {
  const { t } = useTranslation()
  const banner = props.error ?? props.status

  return (
    <div className="finance-hub">
      <section className="finance-section finance-auto-list-card">
        <header className="finance-section-head">
          <div className="finance-section-head-main">
            <div className="finance-section-head-icon">
              <Repeat size={18} />
            </div>
            <div>
              <h3>{t('finance.autoPaymentsTitle')}</h3>
              <p>{t('finance.autoPaymentsDesc')}</p>
            </div>
          </div>
          <div className="finance-section-toolbar">
            <span className="finance-count-badge">{props.autoPayments.length}</span>
            <Button
              size="sm"
              variant="primary"
              className="finance-toolbar-btn finance-auto-create-btn"
              onClick={props.onOpenModal}
            >
              <Plus size={14} />
              {t('finance.autoPaymentCreate')}
            </Button>
          </div>
        </header>

        <div className="finance-section-body">
          {props.autoPayments.length === 0 ? (
            <div className="finance-empty">
              {props.loading ? <RefreshCw size={36} className="spin-icon" /> : <Inbox size={36} />}
              <p>{props.loading ? t('layout.loadingProfile') : t('finance.autoPaymentsEmpty')}</p>
              {!props.loading && (
                <Button variant="primary" onClick={props.onOpenModal}>
                  <Plus size={14} />
                  {t('finance.autoPaymentCreate')}
                </Button>
              )}
            </div>
          ) : (
            <div className="finance-auto-list">
              {props.autoPayments.map((ap) => (
                <article key={ap.auto_payment_id} className="finance-auto-row">
                  <div className="finance-auto-row-icon">
                    <Repeat size={16} />
                  </div>
                  <div className="finance-auto-row-body">
                    <strong>{ap.username ?? ap.user_id ?? '—'}</strong>
                    <span>#{ap.auto_payment_id}</span>
                    {ap.comment && <span className="finance-auto-row-comment">{ap.comment}</span>}
                  </div>
                  <span className="finance-auto-row-amount">{formatCurrencyAmount(ap.amount, ap.currency)}</span>
                  {ap.auto_payment_id && (
                    <button
                      type="button"
                      className="finance-auto-row-delete"
                      title={t('common.delete')}
                      onClick={() => void props.onRemove(ap.auto_payment_id!)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {banner && (
            <div
              className={clsx(
                'finance-status-banner',
                props.error ? 'is-error' : 'is-success'
              )}
            >
              <Zap size={14} />
              {props.error && isTokenError(props.error) ? t('layout.apiOfflineHint') : banner}
            </div>
          )}
        </div>
      </section>

      <FinanceAutoPayModal
        open={props.modalOpen}
        onClose={props.onCloseModal}
        autoPayUser={props.autoPayUser}
        setAutoPayUser={props.setAutoPayUser}
        autoPayAmount={props.autoPayAmount}
        setAutoPayAmount={props.setAutoPayAmount}
        autoPayCurrency={props.autoPayCurrency}
        setAutoPayCurrency={props.setAutoPayCurrency}
        autoPayComment={props.autoPayComment}
        setAutoPayComment={props.setAutoPayComment}
        busy={props.busy}
        onSubmit={props.onCreate}
      />
    </div>
  )
}
