import clsx from 'clsx'
import { ShieldCheck, Save, KeyRound } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { useTranslation } from '@core/i18n'
import { SettingsSecurityHint } from '@modules/settings/SettingsSecurityPanel'

export interface SettingsSecurityMainProps {
  securityAnyEnabled: boolean
  uploadEnabled: boolean
  resellerEnabled: boolean
  financeEnabled: boolean
  secretAnswer: string
  setSecretAnswer: (v: string) => void
  secretSaved: boolean
  onSaveSecret: () => void
  oauthClientSecret: string
  setOauthClientSecret: (v: string) => void
  oauthSecretSaved: boolean
  onSaveOauth: () => void
  onOpenModules: () => void
}

export function SettingsSecurityMain(props: SettingsSecurityMainProps): React.ReactNode {
  const { t } = useTranslation()

  if (!props.securityAnyEnabled) {
    return (
      <div className="settings-hub settings-security-hub">
        <div className="settings-hub-empty">
          <ShieldCheck size={36} />
          <p>{t('settings.securityModuleOff')}</p>
          <Button variant="secondary" className="settings-security-modules-btn" onClick={props.onOpenModules}>
            {t('dashboard.openModulesSettings')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-hub settings-security-hub">
      <SettingsSecurityHint />

      {(props.resellerEnabled || props.financeEnabled) && (
        <section className="settings-hub-section settings-security-card">
          <header className="settings-hub-section-head">
            <div className="settings-hub-section-head-main">
              <div className="settings-hub-section-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3>{t('reseller.secretAnswer')}</h3>
                <p>{t('settings.secretDesc')}</p>
              </div>
            </div>
            <span className={clsx('settings-security-status-badge', props.secretSaved ? 'is-on' : 'is-off')}>
              {props.secretSaved ? t('settings.securityStatusSaved') : t('settings.securityStatusEmpty')}
            </span>
          </header>

          <div className="settings-hub-section-body">
            <div className="settings-security-field-panel">
              <Input
                label={t('reseller.secretAnswer')}
                type="password"
                value={props.secretAnswer}
                onChange={(e) => props.setSecretAnswer(e.target.value)}
                placeholder="••••••••"
              />
              <Button className="settings-security-save-btn" onClick={() => void props.onSaveSecret()}>
                <Save size={14} />
                {t('settings.saveSecret')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {props.uploadEnabled && (
        <section className="settings-hub-section settings-oauth-card">
          <header className="settings-hub-section-head">
            <div className="settings-hub-section-head-main">
              <div className="settings-hub-section-icon">
                <KeyRound size={18} />
              </div>
              <div>
                <h3>{t('settings.oauthClientSecretTitle')}</h3>
                <p>{t('settings.oauthClientSecretDesc')}</p>
              </div>
            </div>
            <span className={clsx('settings-security-status-badge', props.oauthSecretSaved ? 'is-on' : 'is-off')}>
              {props.oauthSecretSaved ? t('settings.oauthSecretStatusSaved') : t('settings.securityStatusEmpty')}
            </span>
          </header>

          <div className="settings-hub-section-body">
            <div className="settings-security-field-panel">
              <Input
                label={t('settings.oauthClientSecretTitle')}
                type="password"
                value={props.oauthClientSecret}
                onChange={(e) => props.setOauthClientSecret(e.target.value)}
                placeholder="••••••••"
              />
              <Button className="settings-security-save-btn" onClick={() => void props.onSaveOauth()}>
                <Save size={14} />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
