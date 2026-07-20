import { Info } from 'lucide-react'
import { AUTH_SCOPES } from '@core/auth-scopes'
import { useTranslation } from '@core/i18n'

type AuthScopesHintVariant = 'modal' | 'loader'

interface AuthScopesHintProps {
  variant?: AuthScopesHintVariant
}

export function AuthScopesHint({ variant = 'modal' }: AuthScopesHintProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className={`auth-scopes-compact auth-scopes-compact--${variant}`}>
      <span className="auth-scopes-compact__text">{t('auth.scopes.compact')}</span>
      <span
        className="auth-scopes-compact__trigger"
        tabIndex={0}
        role="button"
        aria-label={t('auth.scopes.hoverHint')}
      >
        <Info size={13} aria-hidden="true" />
        <span>{t('auth.scopes.hoverHint')}</span>
      </span>
      <div className="auth-scopes-compact__popover" role="tooltip">
        <p className="auth-scopes-compact__popover-title">{t('auth.scopes.title')}</p>
        <ul className="auth-scopes-compact__list">
          {AUTH_SCOPES.map((scope) => (
            <li key={scope.id} className="auth-scopes-compact__item">
              <div className="auth-scopes-compact__row">
                <code>{scope.id}</code>
                <span className={scope.required ? 'is-required' : undefined}>
                  {scope.required ? t('auth.scopes.required') : t('auth.scopes.optional')}
                </span>
              </div>
              <span className="auth-scopes-compact__desc">{t(scope.descKey)}</span>
            </li>
          ))}
        </ul>
        <p className="auth-scopes-compact__footnote">{t('auth.scopes.footnote')}</p>
      </div>
    </div>
  )
}
