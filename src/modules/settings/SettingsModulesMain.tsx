import clsx from 'clsx'
import { Database, Layers, Puzzle } from 'lucide-react'
import { Button } from '@components/Button'
import { Switch } from '@components/Switch'
import { useTranslation } from '@core/i18n'
import { MODULE_BRIDGES } from '@core/module-registry'
import { OPTIONAL_MODULES } from '@core/module-loader'
import { useModulesHelpers, useModulesStore } from '@core/modules-store'

function ModuleToggle({
  id,
  enabled,
  onToggle,
  navKey,
  descKey,
  icon: Icon
}: {
  id: string
  enabled: boolean
  onToggle: (id: string, next: boolean) => void
  navKey: string
  descKey?: string
  icon: React.ComponentType<{ size?: number }>
}): React.ReactNode {
  const { t } = useTranslation()
  const label = t(navKey as Parameters<typeof t>[0])

  return (
    <label className={clsx('settings-module-row', enabled && 'is-on')}>
      <input
        type="checkbox"
        className="settings-module-row-input"
        checked={enabled}
        aria-label={`${label}, ${enabled ? t('modules.enabled') : t('modules.disabled')}`}
        onChange={(e) => onToggle(id, e.target.checked)}
      />
      <span className="settings-module-row-icon">
        <Icon size={18} />
      </span>
      <span className="settings-module-row-body">
        <strong>{t(navKey as Parameters<typeof t>[0])}</strong>
        {descKey && <span>{t(descKey as Parameters<typeof t>[0])}</span>}
      </span>
      <Switch checked={enabled} className="settings-module-row-switch" />
    </label>
  )
}

export interface SettingsModulesMainProps {
  showDemo?: boolean
  demoLoading?: boolean
  onLoadDemo?: () => void
}

export function SettingsModulesMain(props: SettingsModulesMainProps): React.ReactNode {
  const { t } = useTranslation()
  const enabled = useModulesStore((s) => s.enabled)
  const setEnabled = useModulesStore((s) => s.setEnabled)
  const { isBridgeActive } = useModulesHelpers()

  const enabledCount = OPTIONAL_MODULES.filter((mod) => enabled[mod.id] !== false).length

  return (
    <div className="settings-hub settings-modules-hub">
      <section className="settings-hub-section settings-modules-card">
        <header className="settings-hub-section-head">
          <div className="settings-hub-section-head-main">
            <div className="settings-hub-section-icon">
              <Layers size={18} />
            </div>
            <div>
              <h3>{t('modules.title')}</h3>
              <p>{t('modules.intro')}</p>
            </div>
          </div>
          <span className="settings-hub-value-badge">
            {enabledCount}/{OPTIONAL_MODULES.length}
          </span>
        </header>

        <div className="settings-hub-section-body">
          <div className="settings-modules-grid">
            {OPTIONAL_MODULES.map((mod) => (
              <ModuleToggle
                key={mod.id}
                id={mod.id}
                enabled={enabled[mod.id] !== false}
                onToggle={(id, next) => void setEnabled(id, next)}
                navKey={mod.navKey}
                descKey={mod.descKey}
                icon={mod.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="settings-hub-section settings-bridges-card">
        <header className="settings-hub-section-head settings-hub-section-head-compact">
          <div className="settings-hub-section-head-main">
            <div className="settings-hub-section-icon">
              <Puzzle size={18} />
            </div>
            <div>
              <h3>{t('modules.bridgesTitle')}</h3>
              <p>{t('modules.bridgesDesc')}</p>
            </div>
          </div>
        </header>

        <div className="settings-hub-section-body">
          <div className="settings-bridges-list">
            {MODULE_BRIDGES.map((bridge) => {
              const active = isBridgeActive(bridge.id)
              return (
                <article key={bridge.id} className={clsx('settings-bridge-row', active && 'is-active')}>
                  <div className="settings-bridge-row-body">
                    <strong>{t(bridge.descKey as Parameters<typeof t>[0])}</strong>
                    <span>
                      {bridge.requires
                        .map((mid) => {
                          const mod = OPTIONAL_MODULES.find((m) => m.id === mid)
                          return mod ? t(mod.navKey as Parameters<typeof t>[0]) : mid
                        })
                        .join(' + ')}
                    </span>
                  </div>
                  <span className={clsx('settings-bridge-badge', active ? 'is-on' : 'is-off')}>
                    {active ? t('modules.bridgeActive') : t('modules.bridgeInactive')}
                  </span>
                </article>
              )
            })}
          </div>

          <p className="settings-modules-note">{t('modules.note')}</p>
        </div>
      </section>

      {props.showDemo && (
        <section className="settings-hub-section settings-demo-card">
          <header className="settings-hub-section-head settings-hub-section-head-compact">
            <div className="settings-hub-section-head-main">
              <div className="settings-hub-section-icon">
                <Database size={18} />
              </div>
              <div>
                <h3>{t('settings.demoDataTitle')}</h3>
                <p>{t('settings.demoDataDesc')}</p>
              </div>
            </div>
          </header>
          <div className="settings-hub-section-body">
            <Button
              className="settings-demo-btn"
              variant="secondary"
              onClick={() => void props.onLoadDemo?.()}
              disabled={props.demoLoading}
            >
              <Database size={16} />
              {props.demoLoading ? t('analytics.syncing') : t('settings.loadDemoData')}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
