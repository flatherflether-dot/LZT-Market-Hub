import clsx from 'clsx'
import { BarChart3, Percent, TrendingUp, Wallet } from 'lucide-react'
import { useTranslation } from '@core/i18n'
import type { PlReport } from '@core/pl-report'

export interface ResellerStatsRowProps {
  plReport: PlReport
}

function gaugeWidth(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, (Math.abs(value) / max) * 100)
}

export function ResellerStatsRow(props: ResellerStatsRowProps): React.ReactNode {
  const { t } = useTranslation()
  const { plReport } = props
  const roiPct = plReport.totalBuy > 0 ? (plReport.totalMargin / plReport.totalBuy) * 100 : 0
  const marginPositive = plReport.totalMargin >= 0
  const maxRef = Math.max(
    Math.abs(plReport.totalMargin),
    plReport.dealCount * 100,
    Math.abs(plReport.avgMargin),
    Math.abs(roiPct),
    1
  )

  return (
    <div className="dash-gauge-grid is-cols-4">
      <div className={clsx('dash-gauge', marginPositive && 'dash-gauge-accent')}>
        <div className="dash-gauge-head">
          <Wallet size={16} />
          <span>{t('common.margin')}</span>
        </div>
        <span className={clsx('dash-gauge-value', marginPositive ? 'text-success' : 'text-danger')}>
          {plReport.totalMargin.toFixed(0)} ₽
        </span>
        <div className="dash-gauge-bar">
          <div
            className={clsx('dash-gauge-bar-fill', !marginPositive && 'dash-gauge-bar-danger')}
            style={{ width: `${gaugeWidth(plReport.totalMargin, maxRef)}%` }}
          />
        </div>
        <span className="dash-gauge-hint">{t('dashboard.dealsCount', { count: plReport.dealCount })}</span>
      </div>

      <div className="dash-gauge">
        <div className="dash-gauge-head">
          <BarChart3 size={16} />
          <span>{t('reseller.statDealCount')}</span>
        </div>
        <span className="dash-gauge-value">{plReport.dealCount}</span>
        <div className="dash-gauge-bar">
          <div
            className="dash-gauge-bar-fill"
            style={{ width: `${gaugeWidth(plReport.dealCount * 100, maxRef)}%` }}
          />
        </div>
        <span className="dash-gauge-hint">{t('reseller.avgMarginShort')}: {plReport.avgMargin.toFixed(0)} ₽</span>
      </div>

      <div className="dash-gauge">
        <div className="dash-gauge-head">
          <TrendingUp size={16} />
          <span>{t('reseller.avgMarginShort')}</span>
        </div>
        <span className={clsx('dash-gauge-value', plReport.avgMargin >= 0 ? 'text-success' : 'text-danger')}>
          {plReport.avgMargin.toFixed(0)} ₽
        </span>
        <div className="dash-gauge-bar">
          <div
            className={clsx('dash-gauge-bar-fill', plReport.avgMargin < 0 && 'dash-gauge-bar-danger')}
            style={{ width: `${gaugeWidth(plReport.avgMargin, maxRef)}%` }}
          />
        </div>
        <span className="dash-gauge-hint">{t('common.buyPrice')}: {plReport.totalBuy.toFixed(0)} ₽</span>
      </div>

      <div className="dash-gauge">
        <div className="dash-gauge-head">
          <Percent size={16} />
          <span>{t('common.roi')}</span>
        </div>
        <span className={clsx('dash-gauge-value', roiPct >= 0 ? 'text-success' : 'text-danger')}>
          {roiPct.toFixed(1)}%
        </span>
        <div className="dash-gauge-bar">
          <div
            className={clsx('dash-gauge-bar-fill', roiPct < 0 && 'dash-gauge-bar-danger')}
            style={{ width: `${gaugeWidth(roiPct, 100)}%` }}
          />
        </div>
        <span className="dash-gauge-hint">{t('common.sellPrice')}: {plReport.totalSell.toFixed(0)} ₽</span>
      </div>
    </div>
  )
}
