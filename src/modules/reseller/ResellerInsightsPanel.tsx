import clsx from 'clsx'
import { Card } from '@components/Card'
import { useTranslation } from '@core/i18n'
import { getCategoryVisual } from '../upload/category-visuals'

export interface ResellerInsightsPanelProps {
  roiBySource: Array<[string, { margin: number; count: number }]>
  roiByCategory: Array<[string, { margin: number; count: number }]>
  showSource?: boolean
  showCategory?: boolean
  className?: string
}

function sourceLabel(source: string, t: ReturnType<typeof useTranslation>['t']): string {
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
  return map[source] ?? source
}

export function ResellerInsightsPanel(props: ResellerInsightsPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const showSource = props.showSource !== false
  const showCategory = props.showCategory !== false
  const maxSource = Math.max(1, ...props.roiBySource.map(([, d]) => Math.abs(d.margin)))
  const maxCategory = Math.max(1, ...props.roiByCategory.map(([, d]) => Math.abs(d.margin)))

  return (
    <div className={clsx('reseller-insights', props.className)}>
      {showSource && (
        <Card title={t('reseller.roiBySource')} className="card-aside reseller-insight-card">
          {props.roiBySource.length === 0 ? (
            <p className="reseller-insight-empty">{t('reseller.noDeals')}</p>
          ) : (
            <div className="reseller-insight-list">
              {props.roiBySource.map(([src, data]) => (
                <div key={src} className="reseller-insight-row">
                  <span className="reseller-insight-label">{sourceLabel(src, t)}</span>
                  <div className="reseller-insight-bar">
                    <div
                      className={clsx('reseller-insight-fill', data.margin < 0 && 'is-negative')}
                      style={{ width: `${Math.min(100, (Math.abs(data.margin) / maxSource) * 100)}%` }}
                    />
                  </div>
                  <span className={clsx('reseller-insight-value', data.margin >= 0 ? 'is-positive' : 'is-negative')}>
                    {data.margin.toFixed(0)} ₽
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {showCategory && (
        <Card title={t('reseller.roiByCategory')} className="card-aside reseller-insight-card">
          {props.roiByCategory.length === 0 ? (
            <p className="reseller-insight-empty">{t('reseller.noDeals')}</p>
          ) : (
            <div className="reseller-insight-list">
              {props.roiByCategory.map(([cat, data]) => {
                const visual = getCategoryVisual(cat)
                const Icon = visual.icon
                return (
                  <div key={cat} className="reseller-insight-row reseller-insight-row-category">
                    <span className="reseller-insight-label">
                      <span className="reseller-insight-icon" style={{ background: visual.gradient }}>
                        {visual.logoUrl ? (
                          <img src={visual.logoUrl} alt="" className="reseller-insight-logo" />
                        ) : (
                          <Icon size={12} />
                        )}
                      </span>
                      {visual.label}
                    </span>
                    <div className="reseller-insight-bar">
                      <div
                        className={clsx('reseller-insight-fill', data.margin < 0 && 'is-negative')}
                        style={{
                          width: `${Math.min(100, (Math.abs(data.margin) / maxCategory) * 100)}%`,
                          background: data.margin >= 0
                            ? `linear-gradient(90deg, ${visual.accent}88, ${visual.accent})`
                            : undefined
                        }}
                      />
                    </div>
                    <span className={clsx('reseller-insight-value', data.margin >= 0 ? 'is-positive' : 'is-negative')}>
                      {data.margin.toFixed(0)} ₽
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
