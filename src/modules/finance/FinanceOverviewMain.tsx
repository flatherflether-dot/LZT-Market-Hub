import clsx from 'clsx'
import {
  Wallet,
  Zap
} from 'lucide-react'
import { MoneyValue } from '@components/MoneyValue'
import type { BalanceEntry } from '@core/constants'
import { formatCurrencyAmount } from '@core/market-utils'
import {
  amountToEquiv,
  equivAssetLabel,
  formatEquivAmount,
  type LztCurrencySnapshot,
  type EquivBasis
} from '@core/lzt-currency'
import { useTranslation } from '@core/i18n'
import { isTokenError } from './finance-utils'

export interface FinanceOverviewMainProps {
  balance: number
  hold: number
  available: number
  balances: BalanceEntry[]
  currencySnapshot: LztCurrencySnapshot | null
  equivItems: Array<{ code: string; title: string; display: string }>
  marketRateCodes: string[]
  equivBasis: EquivBasis
  setEquivBasis: (v: EquivBasis) => void
  loading: boolean
  status: string | null
  error: string | null
}

export function FinanceOverviewMain(props: FinanceOverviewMainProps): React.ReactNode {
  const { t } = useTranslation()

  const equivBasisOptions: { id: EquivBasis; label: string }[] = [
    { id: 'available', label: t('finance.equivAvailable') },
    { id: 'balance', label: t('finance.equivBalance') },
    { id: 'hold', label: t('finance.equivHold') }
  ]

  const bannerMessage = props.error ?? props.status
  const bannerKind = props.error ? 'error' : props.status ? 'success' : null

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

      <section className="finance-section finance-balances-card">
        <header className="finance-section-head">
          <div className="finance-section-head-main">
            <div className="finance-section-head-icon">
              <Wallet size={18} />
            </div>
            <div>
              <h3>{t('finance.balancesTitle')}</h3>
              <p>{t('finance.syncHint')}</p>
            </div>
          </div>
        </header>

        <div className="finance-section-body">
          <div className="finance-kpi-grid finance-kpi-grid-modern">
            <div className="finance-kpi finance-kpi-modern">
              <span className="finance-kpi-label">{t('finance.balance')}</span>
              <MoneyValue value={props.balance} className="finance-kpi-value" />
            </div>
            <div className="finance-kpi finance-kpi-modern">
              <span className="finance-kpi-label">{t('finance.hold')}</span>
              <MoneyValue value={props.hold} className="finance-kpi-value finance-kpi-value-muted" />
            </div>
            <div className="finance-kpi finance-kpi-modern is-accent">
              <span className="finance-kpi-label">{t('finance.available')}</span>
              <MoneyValue value={props.available} className="finance-kpi-value finance-kpi-value-accent" />
            </div>
          </div>

          {props.currencySnapshot && props.equivItems.length > 0 && (
            <div className="finance-equiv-section">
              <div className="finance-equiv-header">
                <div className="finance-equiv-heading">
                  <p className="finance-equiv-title">{t('finance.equivTitle')}</p>
                  <p className="finance-equiv-desc">{t('finance.equivDesc')}</p>
                </div>
                <div className="finance-equiv-basis">
                  <span className="finance-equiv-basis-label">{t('finance.equivBasis')}</span>
                  {equivBasisOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={clsx('finance-filter-pill', props.equivBasis === opt.id && 'is-active')}
                      onClick={() => props.setEquivBasis(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="finance-equiv-grid">
                {props.equivItems.map((item) => (
                  <div key={item.code} className="finance-equiv-item" title={item.title}>
                    <span className="finance-equiv-asset">{equivAssetLabel(item.code)}</span>
                    <span className="finance-equiv-value">{item.display}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {props.currencySnapshot && props.marketRateCodes.length > 0 && (
            <div className="finance-market-rates-wrap">
              <div className="finance-market-rates-head">
                <p className="finance-market-rates-title">{t('finance.marketRatesTitle')}</p>
                <a
                  href="https://lzt.market/currency"
                  target="_blank"
                  rel="noreferrer"
                  className="finance-market-rates-link"
                >
                  {t('finance.equivMarketLink')}
                </a>
              </div>
              <div className="finance-market-rates-scroll">
                <table className="data-table finance-market-rates-table">
                  <thead>
                    <tr>
                      <th>{t('finance.marketRatesAsset')}</th>
                      <th>{t('finance.marketRatesSymbol')}</th>
                      <th>{t('finance.marketRatesRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.marketRateCodes.map((code) => {
                      const item = props.currencySnapshot!.currencies[code]
                      if (!item) return null
                      return (
                        <tr key={code}>
                          <td>{item.title}</td>
                          <td>{item.symbol}</td>
                          <td>{item.formattedRate ?? `${item.rate.toLocaleString('ru-RU')} ₴`}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {props.balances.length > 0 ? (
            <div className="finance-balance-list">
              {props.balances.map((b) => (
                <article key={b.currency} className="finance-balance-row">
                  <span className="finance-currency-badge">{b.currency.toUpperCase()}</span>
                  <div className="finance-balance-row-main">
                    <span>{formatCurrencyAmount(b.balance, b.currency)}</span>
                    <span className="finance-balance-row-hold">
                      {t('finance.hold')}: {formatCurrencyAmount(b.hold, b.currency)}
                    </span>
                  </div>
                  {props.currencySnapshot && (
                    <span className="finance-balance-row-equiv">
                      {(() => {
                        const btc = amountToEquiv(b.balance ?? 0, b.currency, 'BTC', props.currencySnapshot!)
                        return btc !== null ? `≈ ${formatEquivAmount(btc, 'BTC')} BTC` : '—'
                      })()}
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            !props.loading && (
              <div className="finance-empty">
                <Wallet size={36} />
                <p>{t('finance.syncHint')}</p>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}
