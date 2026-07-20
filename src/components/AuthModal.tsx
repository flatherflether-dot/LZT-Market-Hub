import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { AuthScopesHint } from '@components/AuthScopesHint'
import { useAuthStore } from '@core/auth-store'
import { useTranslation } from '@core/i18n'
import { useUiStore } from '@core/ui-store'

export function AuthModal(): React.ReactNode {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.authModalOpen)
  const closeAuthModal = useUiStore((s) => s.closeAuthModal)
  const { addAccount, isLoading, error } = useAuthStore()
  const [newToken, setNewToken] = useState('')

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') closeAuthModal()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, closeAuthModal])

  useEffect(() => {
    if (!open) setNewToken('')
  }, [open])

  if (!open) return null

  async function handleSubmit(): Promise<void> {
    if (!newToken.trim()) return
    try {
      await addAccount(newToken.trim())
      closeAuthModal()
    } catch {
    }
  }

  return (
    <div className="modal-overlay" onClick={closeAuthModal} role="presentation">
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="auth-modal-title" className="modal-title">{t('layout.authorize')}</h2>
            <p className="modal-description">{t('settings.addAccountDesc')}</p>
          </div>
          <button type="button" className="modal-close" onClick={closeAuthModal} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <AuthScopesHint />
          <Input
            label={t('settings.bearerToken')}
            type="password"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder={t('settings.tokenPlaceholder')}
            autoFocus
          />
          <p className="modal-hint">{t('layout.nicknameAuto')}</p>
          {error && <div className="alert alert-error">{error}</div>}
          <p className="modal-links">
            <a href="https://lolzteam.readme.io/reference/oauth2" target="_blank" rel="noreferrer">{t('settings.oauthGuide')}</a>
            <span>·</span>
            <a href="https://lzt-market.readme.io/reference/information" target="_blank" rel="noreferrer">{t('settings.apiDocs')}</a>
          </p>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={closeAuthModal}>{t('common.cancel')}</Button>
          <Button onClick={() => void handleSubmit()} disabled={!newToken.trim() || isLoading}>
            {isLoading ? t('layout.loadingProfile') : t('layout.authorize')}
          </Button>
        </div>
      </div>
    </div>
  )
}
