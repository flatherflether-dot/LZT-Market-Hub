import { useAuthStore } from '@core/auth-store'
import { useTranslation } from '@core/i18n'
import { LanguageSwitcher } from '@components/LanguageSwitcher'
import { SidebarAccount } from '@components/SidebarAccount'

function apiStatusHint(
  token: string | null,
  username: string | undefined,
  t: ReturnType<typeof useTranslation>['t']
): string {
  if (!token) return t('layout.apiOfflineHint')
  if (username) return t('layout.apiOnlineHint', { username })
  return t('layout.apiOnlineHintGeneric')
}

export function SidebarFooter(): React.ReactNode {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const profile = useAuthStore((s) => s.profile)
  const account = useAuthStore((s) => s.account)
  const username = profile?.username ?? account?.name
  const statusHint = apiStatusHint(token, username, t)

  const language = (
    <div className="sidebar-footer-tools">
      <LanguageSwitcher compact />
    </div>
  )

  return (
    <div className="sidebar-footer">
      <SidebarAccount />

      {token ? (
        language
      ) : (
        <div className="sidebar-footer-panel">
          <span
            className="status-pill status-pill-hint sidebar-footer-status"
            data-hint={statusHint}
            aria-label={statusHint}
          >
            <span className="status-dot" />
            {t('layout.apiOffline')}
          </span>
          {language}
        </div>
      )}
    </div>
  )
}
