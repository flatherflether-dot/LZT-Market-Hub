import { useState } from 'react'
import { Button } from '@components/Button'
import { AuthScopesHint } from '@components/AuthScopesHint'
import { useAuthStore } from '@core/auth-store'
import { completeAuthGate } from '@core/loader-store'
import { useTranslation } from '@core/i18n'

export function LoaderAuthPanel(): React.ReactNode {
  const { t } = useTranslation()
  const addAccount = useAuthStore((s) => s.addAccount)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const [token, setToken] = useState('')

  async function handleSubmit(): Promise<void> {
    const value = token.trim()
    if (!value) return
    try {
      await addAccount(value)
      completeAuthGate()
    } catch {

    }
  }

  return (
    <form
      className="loader-auth-panel"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <AuthScopesHint variant="loader" />
      <input
        className="loader-auth-input textCtrl"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder={t('settings.tokenPlaceholder')}
        aria-label={t('settings.bearerToken')}
        autoFocus
      />
      {error && <div className="loader-auth-error">{error}</div>}
      <Button type="submit" className="full" disabled={!token.trim() || isLoading}>
        {isLoading ? t('layout.loadingProfile') : t('loader.authRequired.submit')}
      </Button>
      <div className="loader-auth-links">
        <a href="https://lolzteam.readme.io/reference/oauth2" target="_blank" rel="noreferrer">
          {t('settings.oauthGuide')}
        </a>
        <span>·</span>
        <a href="https://lzt-market.readme.io/reference/information" target="_blank" rel="noreferrer">
          {t('settings.apiDocs')}
        </a>
      </div>
    </form>
  )
}
