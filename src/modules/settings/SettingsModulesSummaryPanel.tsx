import clsx from 'clsx'
import { Layers, Puzzle } from 'lucide-react'
import { useTranslation } from '@core/i18n'

export interface SettingsModulesSummaryPanelProps {
  enabledCount: number
  totalCount: number
  activeBridges: number
  totalBridges: number
}

export function SettingsModulesSummaryPanel(props: SettingsModulesSummaryPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="settings-modules-panel">
      <header className="settings-modules-panel-head">
        <Layers size={18} />
        <div>
          <h3>{t('modules.title')}</h3>
          <p>{t('modules.subtitle')}</p>
        </div>
      </header>

      <div className="settings-modules-panel-body">
        <div className="settings-modules-panel-list">
          <div className="settings-modules-panel-row">
            <div className="settings-modules-panel-row-main">
              <span className="settings-modules-panel-row-icon">
                <Layers size={14} />
              </span>
              <span className="settings-modules-panel-row-label">{t('modules.title')}</span>
            </div>
            <span className={clsx('settings-modules-panel-value', props.enabledCount > 0 && 'is-ok')}>
              {props.enabledCount}/{props.totalCount}
            </span>
          </div>

          <div className="settings-modules-panel-row">
            <div className="settings-modules-panel-row-main">
              <span className="settings-modules-panel-row-icon">
                <Puzzle size={14} />
              </span>
              <span className="settings-modules-panel-row-label">{t('modules.bridgesTitle')}</span>
            </div>
            <span className={clsx('settings-modules-panel-value', props.activeBridges > 0 && 'is-ok')}>
              {props.activeBridges}/{props.totalBridges}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
