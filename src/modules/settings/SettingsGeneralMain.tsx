import clsx from 'clsx'
import { Radar, RefreshCw, Rocket, Save } from 'lucide-react'
import { Button } from '@components/Button'
import {
  AUTO_REFRESH_INTERVAL_MAX,
  AUTO_REFRESH_INTERVAL_MIN,
  AUTO_REFRESH_INTERVAL_PRESETS,
  clampAutoRefreshInterval
} from '@core/auto-refresh-store'
import { useTranslation } from '@core/i18n'

export const MONITOR_INTERVAL_MIN = 2
export const MONITOR_INTERVAL_MAX = 60
export const MONITOR_INTERVAL_PRESETS = [2, 5, 10, 30] as const

export function clampMonitorInterval(value: number): number {
  return Math.min(MONITOR_INTERVAL_MAX, Math.max(MONITOR_INTERVAL_MIN, value))
}

export interface SettingsGeneralMainProps {
  buyerEnabled: boolean
  autoRefreshEnabled: boolean
  setAutoRefreshEnabled: (v: boolean) => void
  autoRefreshInterval: string
  setAutoRefreshInterval: (v: string) => void
  monitorInterval: string
  setMonitorInterval: (v: string) => void
  monitorAutostart: boolean
  setMonitorAutostart: (v: boolean) => void
  onSave: () => void
}

export function SettingsGeneralMain(props: SettingsGeneralMainProps): React.ReactNode {
  const { t } = useTranslation()
  const refreshIntervalValue = clampAutoRefreshInterval(Number(props.autoRefreshInterval) || 60)
  const monitorIntervalValue = clampMonitorInterval(Number(props.monitorInterval) || 3)

  return (
    <div className="settings-hub">
      <section className="settings-hub-section settings-interval-card">
        <header className="settings-hub-section-head">
          <div className="settings-hub-section-head-main">
            <div className="settings-hub-section-icon">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3>{t('settings.autoRefreshIntervalTitle')}</h3>
              <p>{t('settings.autoRefreshIntervalDesc')}</p>
            </div>
          </div>
          <span className="settings-hub-value-badge">{refreshIntervalValue}s</span>
        </header>

        <div className="settings-hub-section-body">
          <label className="settings-toggle-card">
            <input
              type="checkbox"
              checked={props.autoRefreshEnabled}
              onChange={(e) => props.setAutoRefreshEnabled(e.target.checked)}
            />
            <span>{t('settings.autoRefreshEnabled')}</span>
          </label>

          <div className={clsx('settings-interval-panel', !props.autoRefreshEnabled && 'is-disabled')}>
            <div className="settings-preset-row">
              <span className="settings-preset-label">{t('settings.autoRefreshPresets')}</span>
              <div className="settings-preset-pills">
                {AUTO_REFRESH_INTERVAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={clsx('settings-preset-pill', refreshIntervalValue === preset && 'is-active')}
                    onClick={() => props.setAutoRefreshInterval(String(preset))}
                    disabled={!props.autoRefreshEnabled}
                  >
                    {preset}s
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-range-header">
              <span className="settings-range-label">{t('settings.autoRefreshInterval')}</span>
              <strong className="settings-range-value">{refreshIntervalValue}s</strong>
            </div>
            <input
              type="range"
              className="settings-range-input"
              min={AUTO_REFRESH_INTERVAL_MIN}
              max={AUTO_REFRESH_INTERVAL_MAX}
              step={15}
              value={refreshIntervalValue}
              onChange={(e) => props.setAutoRefreshInterval(e.target.value)}
              disabled={!props.autoRefreshEnabled}
            />
            <div className="settings-range-ticks">
              <span>{AUTO_REFRESH_INTERVAL_MIN}s</span>
              <span>60s</span>
              <span>180s</span>
              <span>{AUTO_REFRESH_INTERVAL_MAX}s</span>
            </div>
          </div>
        </div>
      </section>

      {props.buyerEnabled ? (
        <>
          <section className="settings-hub-section settings-interval-card">
            <header className="settings-hub-section-head">
              <div className="settings-hub-section-head-main">
                <div className="settings-hub-section-icon">
                  <Radar size={18} />
                </div>
                <div>
                  <h3>{t('settings.monitorIntervalTitle')}</h3>
                  <p>{t('settings.monitorIntervalDesc')}</p>
                </div>
              </div>
              <span className="settings-hub-value-badge">{monitorIntervalValue}s</span>
            </header>

            <div className="settings-hub-section-body">
              <div className="settings-interval-panel">
                <div className="settings-preset-row">
                  <span className="settings-preset-label">{t('settings.monitorPresets')}</span>
                  <div className="settings-preset-pills">
                    {MONITOR_INTERVAL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={clsx('settings-preset-pill', monitorIntervalValue === preset && 'is-active')}
                        onClick={() => props.setMonitorInterval(String(preset))}
                      >
                        {preset}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-range-header">
                  <span className="settings-range-label">{t('settings.monitorInterval')}</span>
                  <strong className="settings-range-value">{monitorIntervalValue}s</strong>
                </div>
                <input
                  type="range"
                  className="settings-range-input"
                  min={MONITOR_INTERVAL_MIN}
                  max={MONITOR_INTERVAL_MAX}
                  step={1}
                  value={monitorIntervalValue}
                  onChange={(e) => props.setMonitorInterval(e.target.value)}
                />
                <div className="settings-range-ticks">
                  <span>{MONITOR_INTERVAL_MIN}s</span>
                  <span>10s</span>
                  <span>30s</span>
                  <span>{MONITOR_INTERVAL_MAX}s</span>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-hub-section settings-autostart-card">
            <header className="settings-hub-section-head settings-hub-section-head-compact">
              <div className="settings-hub-section-head-main">
                <div className="settings-hub-section-icon">
                  <Rocket size={18} />
                </div>
                <div>
                  <h3>{t('settings.monitorAutostartTitle')}</h3>
                  <p>{t('settings.monitorAutostartDesc')}</p>
                </div>
              </div>
            </header>
            <div className="settings-hub-section-body">
              <label className="settings-toggle-card">
                <input
                  type="checkbox"
                  checked={props.monitorAutostart}
                  onChange={(e) => props.setMonitorAutostart(e.target.checked)}
                />
                <span>{t('settings.monitorAutostart')}</span>
              </label>
            </div>
          </section>
        </>
      ) : (
        <div className="settings-hub-empty">
          <Radar size={36} />
          <p>{t('settings.monitorDisabledHint')}</p>
        </div>
      )}

      <div className="settings-hub-footer">
        <Button className="settings-hub-save-btn" onClick={() => void props.onSave()}>
          <Save size={14} />
          {t('settings.saveSettings')}
        </Button>
      </div>
    </div>
  )
}
