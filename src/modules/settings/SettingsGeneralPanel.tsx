import clsx from 'clsx'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@core/i18n'

export interface SettingsGeneralPanelProps {
  autoRefreshEnabled: boolean
  autoRefreshInterval: string
}

export function SettingsGeneralPanel(props: SettingsGeneralPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="settings-monitor-panel">
      <header className="settings-monitor-panel-head">
        <RefreshCw size={18} />
        <div>
          <h3>{t('settings.autoRefreshStatusTitle')}</h3>
          <p>{props.autoRefreshEnabled ? t('settings.autoRefreshRunning') : t('settings.autoRefreshPaused')}</p>
        </div>
      </header>

      <div className="settings-monitor-panel-body">
        <div className="settings-monitor-list">
          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <RefreshCw size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('common.status')}</span>
            </div>
            <span className={clsx('settings-monitor-badge', props.autoRefreshEnabled ? 'is-on' : 'is-off')}>
              {props.autoRefreshEnabled ? t('common.on') : t('common.off')}
            </span>
          </div>

          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <RefreshCw size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('settings.autoRefreshCurrentInterval')}</span>
            </div>
            <span className="settings-monitor-row-value">{props.autoRefreshInterval}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
