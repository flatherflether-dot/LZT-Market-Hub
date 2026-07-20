import clsx from 'clsx'
import { Activity, ArrowUpRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from '@core/i18n'
import {
  buildToolsStatusItems,
  type ToolsStatusDataProps
} from '@modules/tools/tools-status-data'

function gridColsClass(count: number): string {
  if (count <= 2) return 'is-cols-2'
  if (count === 3) return 'is-cols-3'
  if (count === 4) return 'is-cols-4'
  return 'is-cols-5'
}

export function DashboardIntegrationCards(props: ToolsStatusDataProps): React.ReactNode {
  const { t } = useTranslation()
  const items = buildToolsStatusItems(props, t)

  if (items.length === 0) return null

  return (
    <section className="dash-integration-section">
      <header className="dash-integration-section-head">
        <span className="dash-integration-section-icon">
          <Activity size={18} />
        </span>
        <div className="dash-integration-section-copy">
          <h3>{t('tools.statusTitle')}</h3>
          <p>{t('tools.statusHint')}</p>
        </div>
      </header>

      <div className={clsx('dash-integration-grid', gridColsClass(items.length))}>
        {items.map((item) => {
          const Icon = item.icon
          const isNumeric = /^\d+$/.test(item.value)
          const card = (
            <article
              className={clsx('dash-integration-card', item.ok && 'is-ok', item.href && 'is-link')}
            >
              <div className="dash-integration-card-top">
                <span className="dash-integration-card-icon">
                  <Icon size={17} />
                </span>
                <span
                  className={clsx('dash-integration-card-dot', item.ok ? 'is-on' : 'is-off')}
                  title={item.ok ? t('common.on') : t('common.off')}
                />
              </div>

              <span className="dash-integration-card-label">{item.label}</span>

              <span
                className={clsx(
                  'dash-integration-card-value',
                  !isNumeric && 'is-text'
                )}
              >
                {item.value}
              </span>

              <span className="dash-integration-card-hint">{item.hint}</span>

              {item.href && (
                <span className="dash-integration-card-link">
                  <ArrowUpRight size={13} />
                </span>
              )}
            </article>
          )

          if (!item.href) return <div key={item.key}>{card}</div>

          return (
            <NavLink key={item.key} to={item.href} className="dash-integration-card-wrap">
              {card}
            </NavLink>
          )
        })}
      </div>
    </section>
  )
}
