import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '@core/auth-store'
import { useTranslation } from '@core/i18n'
import { useUiStore } from '@core/ui-store'

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }): React.ReactNode {
  const initial = username.charAt(0).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        className="sidebar-user-avatar"
        src={avatarUrl}
        alt={username}
        referrerPolicy="no-referrer"
      />
    )
  }

  return <div className="sidebar-user-avatar sidebar-user-avatar-fallback">{initial}</div>
}

interface SidebarAccountProps {
  compact?: boolean
}

export function SidebarAccount({ compact = false }: SidebarAccountProps): React.ReactNode {
  const { t } = useTranslation()
  const location = useLocation()
  const onAccountPage = location.pathname === '/account'
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const token = useAuthStore((s) => s.token)
  const profile = useAuthStore((s) => s.profile)
  const profileLoading = useAuthStore((s) => s.profileLoading)

  if (!token) {
    return (
      <button
        type="button"
        className={clsx('button primary', compact && 'smallButton', !compact && 'full')}
        onClick={openAuthModal}
      >
        {t('layout.authorize')}
      </button>
    )
  }

  if (profileLoading && !profile) {
    return (
      <div className={compact ? 'topbar-user-loading' : 'sidebar-user-card sidebar-user-card-loading'}>
        {t('layout.loadingProfile')}
      </div>
    )
  }

  if (!profile) {
    return (
      <button
        type="button"
        className={clsx('button primary', compact && 'smallButton', !compact && 'full')}
        onClick={openAuthModal}
      >
        {t('layout.authorize')}
      </button>
    )
  }

  if (compact) {
    return (
      <NavLink
        to="/account"
        className={({ isActive }) => clsx('topbar-user-card', (isActive || onAccountPage) && 'topbar-user-card-active')}
        title={profile.username}
      >
        <Avatar username={profile.username} avatarUrl={profile.avatarUrl} />
        <span className="sidebar-user-name">{profile.username}</span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to="/account"
      className={({ isActive }) => clsx('sidebar-user-card', (isActive || onAccountPage) && 'sidebar-user-card-active')}
    >
      <Avatar username={profile.username} avatarUrl={profile.avatarUrl} />
      <span className="sidebar-user-name">{profile.username}</span>
    </NavLink>
  )
}
