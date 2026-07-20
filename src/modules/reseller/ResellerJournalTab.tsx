import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowRightLeft,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Select } from '@components/FormFields'
import { useTranslation } from '@core/i18n'
import type { PlPeriod, PlReport } from '@core/pl-report'
import type { Deal } from '@renderer/types/database'
import { getCategoryVisual } from '../upload/category-visuals'

export interface ResellerJournalTabProps {
  deals: Deal[]
  plReport: PlReport
  plPeriod: PlPeriod
  onPlPeriodChange: (period: PlPeriod) => void
  plPeriodOptions: Array<{ value: string; label: string }>
  exportPick: string
  exportOptions: Array<{ value: string; label: string }>
  onExportPick: (value: string) => void
  dealChains: Array<{ itemId: number; steps: Deal[] }>
  onOpenMarginCalc: () => void
}

function sourceLabel(source: string | null, action: string, t: ReturnType<typeof useTranslation>['t']): string {
  const key = source ?? action
  const map: Record<string, string> = {
    flip: t('reseller.sourceFlip'),
    transfer: t('reseller.sourceTransfer'),
    wholesale: t('reseller.sourceWholesale'),
    autobuy: t('reseller.sourceAutobuy'),
    upload: t('reseller.sourceUpload'),
    cart_confirm: t('reseller.sourceCart'),
    cart_safe: t('reseller.sourceCart'),
    invoice: t('reseller.sourceInvoice'),
    resell: t('reseller.sourceFlip')
  }
  return map[key] ?? key
}

const JOURNAL_PAGE_SIZES = [5, 10, 25, 50, 100] as const

export function ResellerJournalTab(props: ResellerJournalTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  const totalPages = Math.max(1, Math.ceil(props.deals.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [props.plPeriod, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedDeals = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return props.deals.slice(start, start + pageSize)
  }, [props.deals, safePage, pageSize])

  return (
    <div className="dashboard-main-stack">
      <Card className="card-main reseller-journal-card">
        <div className="reseller-toolbar reseller-section-toolbar">
          <div className="reseller-toolbar-row">
            <div className="reseller-toolbar-title">
              <h3>{t('reseller.dealJournal')}</h3>
              <span className="reseller-section-count">{props.deals.length}</span>
            </div>
            <div className="reseller-periods" role="tablist" aria-label={t('reseller.plPeriod')}>
              {props.plPeriodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={props.plPeriod === opt.value}
                  className={clsx('reseller-period', props.plPeriod === opt.value && 'active')}
                  onClick={() => props.onPlPeriodChange(opt.value as PlPeriod)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reseller-toolbar-row is-actions">
            <Button
              size="sm"
              variant="secondary"
              className="reseller-toolbar-calc"
              onClick={props.onOpenMarginCalc}
            >
              <Calculator size={14} />
              {t('reseller.openMarginCalcShort')}
            </Button>

            <div className="reseller-toolbar-actions">
              <Select
                compact
                className="reseller-toolbar-export"
                menuMinWidth={200}
                ariaLabel={t('reseller.plExportMenu')}
                value={props.exportPick}
                options={props.exportOptions}
                onChange={(e) => props.onExportPick(e.target.value)}
              />
            </div>
          </div>
        </div>

        {props.deals.length === 0 ? (
          <div className="reseller-empty">
            <BarChart3 size={28} />
            <p>{t('reseller.noDeals')}</p>
          </div>
        ) : (
          <div className="reseller-list">
            {paginatedDeals.map((deal) => {
              const visual = getCategoryVisual(deal.category)
              const Icon = visual.icon
              const margin = deal.margin ?? 0
              const positive = margin >= 0

              return (
                <div
                  key={deal.id}
                  className={clsx('reseller-row', positive ? 'is-positive' : 'is-negative')}
                >
                  <div
                    className="reseller-icon"
                    style={{ background: visual.gradient }}
                    title={visual.label}
                  >
                    {visual.logoUrl ? (
                      <img src={visual.logoUrl} alt="" className="reseller-logo" />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>

                  <div className="reseller-body">
                    <div className="reseller-head">
                      <span className="reseller-action">{sourceLabel(deal.source, deal.action, t)}</span>
                      <span className="reseller-category">{visual.label}</span>
                      {deal.item_id && (
                        <a
                          className="reseller-item-link"
                          href={`https://lzt.market/${deal.item_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          #{deal.item_id}
                        </a>
                      )}
                    </div>
                    <div className="reseller-meta">
                      {deal.buy_price != null && (
                        <span>{t('common.buyPrice')}: {deal.buy_price.toFixed(0)} ₽</span>
                      )}
                      {deal.sell_price != null && (
                        <span>{t('common.sellPrice')}: {deal.sell_price.toFixed(0)} ₽</span>
                      )}
                      {deal.transfer_to && (
                        <span className="reseller-transfer-tag">
                          <ArrowRightLeft size={12} />
                          {deal.transfer_to}
                        </span>
                      )}
                      <span className="reseller-date">
                        {new Date(deal.created_at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {deal.notes && <p className="reseller-notes">{deal.notes}</p>}
                  </div>

                  <div className={clsx('reseller-margin', positive ? 'is-positive' : 'is-negative')}>
                    {deal.margin != null ? `${margin.toFixed(0)} ₽` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {props.deals.length > 0 && (
          <footer className="reseller-journal-footer">
            <div className="reseller-journal-pages">
              <button
                type="button"
                className="reseller-journal-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('common.prevPage')}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="reseller-journal-page-label">
                {t('reseller.journalPageOf', { page: safePage, total: totalPages })}
              </span>
              <button
                type="button"
                className="reseller-journal-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('common.nextPage')}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="reseller-journal-per-page">
              <span className="reseller-journal-per-page-label">{t('reseller.journalPerPage')}</span>
              <div className="reseller-journal-per-page-options" role="group" aria-label={t('reseller.journalPerPage')}>
                {JOURNAL_PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={clsx('reseller-journal-per-page-btn', pageSize === size && 'active')}
                    onClick={() => setPageSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </footer>
        )}
      </Card>

      {props.dealChains.length > 0 && (
        <Card title={t('reseller.dealChains')} className="card-main reseller-chains-card">
          <div className="reseller-chain-list">
            {props.dealChains.slice(0, 8).map((chain) => (
              <div key={chain.itemId} className="reseller-chain-row">
                <a
                  className="reseller-chain-id"
                  href={`https://lzt.market/${chain.itemId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  #{chain.itemId}
                </a>
                <div className="reseller-chain-steps">
                  {chain.steps.map((s, i) => (
                    <span key={s.id} className="reseller-chain-step-wrap">
                      {i > 0 && (
                        <span className="reseller-chain-arrow-wrap" aria-hidden="true">
                          <ArrowRightLeft size={12} strokeWidth={2} />
                        </span>
                      )}
                      <span className="reseller-chain-step">{sourceLabel(s.source, s.action, t)}</span>
                    </span>
                  ))}
                </div>
                <span className="reseller-chain-total">
                  {chain.steps.reduce((sum, s) => sum + (s.margin ?? 0), 0).toFixed(0)} ₽
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
