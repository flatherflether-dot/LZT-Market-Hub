import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  RefreshCw,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import type { PaymentRecord } from '@core/constants'
import { downloadCsv, toCsv } from '@core/export-csv'
import { useTranslation } from '@core/i18n'
import { formatPaymentTs, isTokenError } from './finance-utils'
import { getPaymentTypeLabel, sortPaymentTypes } from './payment-types'

const PAYMENTS_PAGE_SIZES = [10, 25, 50, 100] as const

export interface FinancePaymentsTabProps {
  payments: PaymentRecord[]
  loading: boolean
  status: string | null
  error: string | null
}

export function FinancePaymentsTab(props: FinancePaymentsTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const bannerMessage = props.error ?? props.status
  const bannerKind = props.error ? 'error' : props.status ? 'success' : null

  const paymentTypes = useMemo(
    () => sortPaymentTypes([...new Set(props.payments.map((p) => p.type).filter(Boolean) as string[])]),
    [props.payments]
  )

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const payment of props.payments) {
      if (!payment.type) continue
      counts.set(payment.type, (counts.get(payment.type) ?? 0) + 1)
    }
    return counts
  }, [props.payments])

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return props.payments
    return props.payments.filter((p) => p.type === paymentFilter)
  }, [props.payments, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [paymentFilter, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredPayments.slice(start, start + pageSize)
  }, [filteredPayments, safePage, pageSize])

  function exportPaymentsCsv(): void {
    downloadCsv(
      'finance-payments.csv',
      toCsv(filteredPayments as unknown as Record<string, unknown>[], [
        'payment_id',
        'amount',
        'type',
        'comment',
        'created_at'
      ])
    )
  }

  const categoryTabs = [
    { id: 'all', label: t('buyer.filterAllCategories'), count: props.payments.length },
    ...paymentTypes.map((type) => ({
      id: type,
      label: getPaymentTypeLabel(type, t),
      count: typeCounts.get(type) ?? 0
    }))
  ]

  return (
    <div className="finance-hub">
      {bannerMessage && (
        <div
          className={clsx(
            'finance-status-banner',
            bannerKind === 'success' && 'is-success',
            bannerKind === 'error' && 'is-error'
          )}
        >
          <Zap size={14} />
          {props.error && isTokenError(props.error) ? t('layout.apiOfflineHint') : bannerMessage}
        </div>
      )}

      <section className="finance-section finance-payments-card">
        <header className="finance-section-head">
          <div className="finance-section-head-main">
            <div className="finance-section-head-icon">
              <ArrowDownLeft size={18} />
            </div>
            <div>
              <h3>{t('finance.paymentsTitle')}</h3>
              <p>{t('finance.paymentsDesc')}</p>
            </div>
          </div>
          <div className="finance-section-toolbar">
            <span className="finance-count-badge">{filteredPayments.length}</span>
            <Button
              size="sm"
              variant="secondary"
              className="finance-toolbar-btn"
              onClick={exportPaymentsCsv}
              disabled={!filteredPayments.length}
            >
              <Download size={14} />
              {t('analytics.exportPayments')}
            </Button>
          </div>
        </header>

        <div className="finance-section-body finance-payments-body">
          <div className="finance-payments-tabs-wrap">
            <div className="finance-payments-tabs" role="tablist" aria-label={t('finance.paymentsCategories')}>
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={paymentFilter === tab.id}
                  className={clsx('finance-payments-tab', paymentFilter === tab.id && 'is-active')}
                  onClick={() => setPaymentFilter(tab.id)}
                >
                  <span className="finance-payments-tab-label">{tab.label}</span>
                  <span className="finance-payments-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="finance-empty finance-empty-compact">
              {props.loading ? <RefreshCw size={32} className="spin-icon" /> : <Inbox size={32} />}
              <p>{props.loading ? t('layout.loadingProfile') : t('common.noData')}</p>
            </div>
          ) : (
            <>
              <div className="finance-payments-table-head" aria-hidden="true">
                <span>{t('finance.paymentsColCategory')}</span>
                <span>{t('finance.paymentsColComment')}</span>
                <span>{t('finance.paymentsColDate')}</span>
                <span>{t('finance.paymentsColAmount')}</span>
              </div>

              <div className="finance-payments-list">
                {paginatedPayments.map((p) => {
                  const positive = (p.amount ?? 0) >= 0
                  const typeLabel = getPaymentTypeLabel(p.type, t)
                  return (
                    <article key={p.payment_id} className="finance-payment-row">
                      <div className={clsx('finance-payment-icon', positive ? 'is-in' : 'is-out')}>
                        {positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="finance-payment-category">
                        <strong>{typeLabel}</strong>
                        <span>#{p.payment_id}</span>
                      </div>
                      <p className="finance-payment-comment">{p.comment?.trim() || '—'}</p>
                      <time className="finance-payment-date">{formatPaymentTs(p.created_at)}</time>
                      <span className={clsx('finance-payment-amount', positive ? 'is-in' : 'is-out')}>
                        {positive ? '+' : ''}
                        {p.amount?.toLocaleString('ru-RU')} ₽
                      </span>
                    </article>
                  )
                })}
              </div>

              <footer className="finance-payments-footer">
                <div className="finance-payments-pages">
                  <button
                    type="button"
                    className="finance-payments-page-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={t('common.prevPage')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="finance-payments-page-label">
                    {t('reseller.journalPageOf', { page: safePage, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    className="finance-payments-page-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label={t('common.nextPage')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="finance-payments-per-page">
                  <span className="finance-payments-per-page-label">{t('reseller.journalPerPage')}</span>
                  <div className="finance-payments-per-page-options" role="group" aria-label={t('reseller.journalPerPage')}>
                    {PAYMENTS_PAGE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={clsx('finance-payments-per-page-btn', pageSize === size && 'is-active')}
                        onClick={() => setPageSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
