import clsx from 'clsx'
import { Activity } from 'lucide-react'
import { useTranslation } from '@core/i18n'
import {
  buildToolsStatusItems,
  type ToolsStatusDataProps
} from './tools-status-data'

export type ToolsStatusPanelProps = ToolsStatusDataProps

export function ToolsStatusPanel(props: ToolsStatusPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const items = buildToolsStatusItems(props, t)

  return (
    <div className="tools-status-panel">
      <header className="tools-status-panel-head">
        <Activity size={18} />
        <div>
          <h3>{t('tools.statusTitle')}</h3>
          <p>{t('tools.statusHint')}</p>
        </div>
      </header>

      <div className="tools-status-panel-body">
        <div className="tools-status-list">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.key} className="tools-status-row">
                <div className="tools-status-row-main">
                  <span className="tools-status-row-icon">
                    <Icon size={14} />
                  </span>
                  <span className="tools-status-row-label">{item.label}</span>
                </div>
                <span className={clsx('tools-status-row-value', item.ok && 'is-ok')}>{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
