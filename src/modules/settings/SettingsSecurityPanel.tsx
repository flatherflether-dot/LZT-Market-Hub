import { ShieldCheck } from 'lucide-react'
import { useTranslation } from '@core/i18n'

export function SettingsSecurityHint(): React.ReactNode {
  const { t } = useTranslation()

  return (
    <section className="settings-hub-section settings-security-hint-card">
      <header className="settings-hub-section-head settings-hub-section-head-compact">
        <div className="settings-hub-section-head-main">
          <div className="settings-hub-section-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3>{t('settings.securityHintTitle')}</h3>
            <p>{t('settings.securityHintDesc')}</p>
          </div>
        </div>
      </header>
    </section>
  )
}
