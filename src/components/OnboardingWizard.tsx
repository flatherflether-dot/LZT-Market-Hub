import { useEffect, useState } from 'react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { AuthScopesHint } from '@components/AuthScopesHint'
import { useAuthStore } from '@core/auth-store'
import { useCategoryOptions, useTranslation } from '@core/i18n'

type Step = 'welcome' | 'token' | 'secret' | 'demo' | 'filter' | 'done'

export function OnboardingWizard(): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()
  const addAccount = useAuthStore((s) => s.addAccount)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('welcome')
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [filterName, setFilterName] = useState('')
  const [category, setCategory] = useState('steam')
  const [pmax, setPmax] = useState('500')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.api.db.getSetting('onboarding_completed').then((v) => {
      if (v !== '1') setVisible(true)
    })
  }, [])

  useEffect(() => {
    if (!visible) return
    if (useAuthStore.getState().token) {
      setStep((current) => (current === 'welcome' || current === 'token' ? 'secret' : current))
    }
  }, [visible])

  if (!visible) return null

  async function finish(): Promise<void> {
    await window.api.db.setSetting('onboarding_completed', '1')
    setVisible(false)
  }

  async function saveToken(): Promise<void> {
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addAccount(token.trim())
      setStep('secret')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function saveSecret(): Promise<void> {
    if (secret.trim()) {
      await window.api.db.setSetting('market_secret_answer', secret.trim())
    }
    setStep('demo')
  }

  async function seedDemo(): Promise<void> {
    setLoading(true)
    try {
      await window.api.db.seedDemoData(false)
    } finally {
      setLoading(false)
      setStep('filter')
    }
  }

  async function saveFilter(): Promise<void> {
    if (filterName.trim()) {
      await window.api.db.saveWatchFilter({
        name: filterName.trim(),
        category,
        params_json: JSON.stringify({ pmax: Number(pmax) || undefined }),
        is_enabled: 1
      })
    }
    setStep('done')
  }

  return (
    <div className="modal-overlay onboarding-overlay" role="presentation">
      <div className="modal-dialog onboarding-dialog" role="dialog" aria-modal="true">
        {step === 'welcome' && (
          <>
            <h2 className="modal-title">{t('onboarding.welcomeTitle')}</h2>
            <p className="modal-description">{t('onboarding.welcomeDesc')}</p>
            <div className="onboarding-steps">
              <span>1. {t('onboarding.stepToken')}</span>
              <span>2. {t('onboarding.stepSecret')}</span>
              <span>3. {t('onboarding.stepDemo')}</span>
              <span>4. {t('onboarding.stepFilter')}</span>
            </div>
            <Button className="full" onClick={() => setStep('token')}>{t('onboarding.start')}</Button>
            <Button variant="ghost" className="full" onClick={() => void finish()}>{t('onboarding.skip')}</Button>
          </>
        )}

        {step === 'token' && (
          <>
            <h2 className="modal-title">{t('onboarding.tokenTitle')}</h2>
            <AuthScopesHint />
            <Input
              label={t('settings.bearerToken')}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('settings.tokenPlaceholder')}
            />
            {error && <div className="alert alert-error">{error}</div>}
            <Button className="full" onClick={() => void saveToken()} disabled={!token.trim() || loading}>
              {t('common.save')}
            </Button>
          </>
        )}

        {step === 'secret' && (
          <>
            <h2 className="modal-title">{t('onboarding.secretTitle')}</h2>
            <p className="modal-description">{t('onboarding.secretDesc')}</p>
            <Input
              label={t('reseller.secretAnswer')}
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <Button className="full" onClick={() => void saveSecret()}>{t('common.save')}</Button>
            <Button variant="ghost" className="full" onClick={() => setStep('demo')}>{t('onboarding.skipStep')}</Button>
          </>
        )}

        {step === 'demo' && (
          <>
            <h2 className="modal-title">{t('onboarding.demoTitle')}</h2>
            <p className="modal-description">{t('onboarding.demoDesc')}</p>
            <Button className="full" onClick={() => void seedDemo()} disabled={loading}>
              {t('onboarding.loadDemo')}
            </Button>
            <Button variant="ghost" className="full" onClick={() => setStep('filter')}>{t('onboarding.skipStep')}</Button>
          </>
        )}

        {step === 'filter' && (
          <>
            <h2 className="modal-title">{t('onboarding.filterTitle')}</h2>
            <Input label={t('common.name')} value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder={t('buyer.defaultFilterName')} />
            <Select label={t('common.category')} value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />
            <Input label={t('buyer.maxPrice')} type="number" value={pmax} onChange={(e) => setPmax(e.target.value)} />
            <Button className="full" onClick={() => void saveFilter()}>{t('onboarding.finish')}</Button>
            <Button variant="ghost" className="full" onClick={() => setStep('done')}>{t('onboarding.skipStep')}</Button>
          </>
        )}

        {step === 'done' && (
          <>
            <h2 className="modal-title">{t('onboarding.doneTitle')}</h2>
            <p className="modal-description">{t('onboarding.doneDesc')}</p>
            <Button className="full" onClick={() => void finish()}>{t('onboarding.openApp')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
