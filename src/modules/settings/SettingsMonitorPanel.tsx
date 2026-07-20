import clsx from 'clsx'
import { Activity, Radar } from 'lucide-react'
import { Button } from '@components/Button'
import { MediaPlayIcon } from '@components/MediaPlayIcon'
import { MediaStopIcon } from '@components/MediaStopIcon'
import { useTranslation } from '@core/i18n'

export interface SettingsMonitorPanelProps {
  monitorRunning: boolean
  monitorBusy: boolean
  monitorInterval: string
  monitorAutostart: boolean
  savedFilters: number
  hasToken: boolean
  onToggle: () => void
}

export function SettingsMonitorPanel(props: SettingsMonitorPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="settings-monitor-panel">
      <header className="settings-monitor-panel-head">
        <Radar size={18} />
        <div>
          <h3>{t('settings.monitorStatusTitle')}</h3>
          <p>{props.monitorRunning ? t('settings.monitorRunning') : t('settings.monitorStopped')}</p>
        </div>
      </header>

      <div className="settings-monitor-panel-body">
        <div className="settings-monitor-list">
          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <Activity size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('common.status')}</span>
            </div>
            <span className={clsx('settings-monitor-badge', props.monitorRunning ? 'is-on' : 'is-off')}>
              {props.monitorRunning ? t('common.on') : t('common.off')}
            </span>
          </div>

          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <Radar size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('settings.monitorCurrentInterval')}</span>
            </div>
            <span className="settings-monitor-row-value">{props.monitorInterval}s</span>
          </div>

          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <Activity size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('settings.monitorSavedFilters')}</span>
            </div>
            <span className={clsx('settings-monitor-row-value', props.savedFilters > 0 && 'is-ok')}>
              {props.savedFilters}
            </span>
          </div>

          <div className="settings-monitor-row">
            <div className="settings-monitor-row-main">
              <span className="settings-monitor-row-icon">
                <MediaPlayIcon size={14} />
              </span>
              <span className="settings-monitor-row-label">{t('settings.monitorAutostart')}</span>
            </div>
            <span className={clsx('settings-monitor-badge', props.monitorAutostart ? 'is-on' : 'is-off')}>
              {props.monitorAutostart ? t('common.on') : t('common.off')}
            </span>
          </div>
        </div>

        <Button
          className="settings-monitor-action"
          variant={props.monitorRunning ? 'secondary' : 'primary'}
          onClick={() => void props.onToggle()}
          disabled={props.monitorBusy || !props.hasToken}
        >
          {props.monitorRunning ? <MediaStopIcon size={14} /> : <MediaPlayIcon size={14} />}
          {props.monitorRunning ? t('settings.monitorStop') : t('settings.monitorStart')}
        </Button>
      </div>
    </div>
  )
}
