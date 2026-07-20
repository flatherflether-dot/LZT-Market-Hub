import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Card } from '@components/Card'
import { MoneyValue } from '@components/MoneyValue'
import { Button } from '@components/Button'
import { PageLayout } from '@components/PageLayout'
import { useAuthStore } from '@core/auth-store'
import { useTranslation } from '@core/i18n'
import { useModulesHelpers } from '@core/modules-store'
import { useUiStore } from '@core/ui-store'
import type { DashboardStats } from '@renderer/types/database'

function maskToken(token: string): string {
  if (token.length <= 10) return '••••••••'
  return `${token.slice(0, 6)}…${token.slice(-4)}`
}

function ProfileAvatar({
  username,
  avatarUrl,
  size = 80
}: {
  username: string
  avatarUrl: string | null
  size?: number
}): React.ReactNode {
  const initial = username.charAt(0).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        className="profile-hero-avatar"
        src={avatarUrl}
        alt={username}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="profile-hero-avatar profile-hero-avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initial}
    </div>
  )
}

export function AccountPage(): React.ReactNode {
  const { account, token, profile, profileLoading, logout, fetchProfile } = useAuthStore()
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const { t } = useTranslation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const { isEnabled } = useModulesHelpers()
  const uploadEnabled = isEnabled('upload')
  const resellerEnabled = isEnabled('reseller')
  const buyerEnabled = isEnabled('buyer')
  const automationEnabled = isEnabled('automation')

  useEffect(() => {
    if (!token) {
      setStats(null)
      return
    }
    void window.api.db.getDashboardStats().then(setStats)
  }, [token, profile])

  async function refreshProfileData(): Promise<void> {
    setRefreshing(true)
    try {
      await fetchProfile()
      const nextStats = await window.api.db.getDashboardStats()
      setStats(nextStats)
    } finally {
      setRefreshing(false)
    }
  }

  const availableBalance = Math.max(0, (profile?.balance ?? 0) - (profile?.hold ?? 0))

  const main = !token ? (
    <Card title={t('settings.accountTitle')} className="card-main">
      <div className="settings-empty-auth">
        <p className="empty-state">{t('settings.noAccountsHint')}</p>
        <Button className="full" onClick={openAuthModal}>{t('layout.authorize')}</Button>
      </div>
    </Card>
  ) : (
    <div className="settings-account-primary">
      <Card className="card-main profile-hero-card">
        <div className="profile-hero">
          <ProfileAvatar username={profile?.username ?? account?.name ?? '?'} avatarUrl={profile?.avatarUrl ?? null} />
          <div className="profile-hero-info">
            <h2 className="profile-hero-name">{profile?.username ?? account?.name ?? '—'}</h2>
            <div className="profile-hero-meta-row">
              {profile?.userId && <span>ID {profile.userId}</span>}
              {account && (
                <span>
                  {t('settings.profileConnected')} {new Date(account.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {profileLoading && !profile && (
              <div className="profile-hero-meta">{t('settings.profileLoading')}</div>
            )}
            {profile?.profileUrl && (
              <a className="profile-hero-link" href={profile.profileUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                {t('settings.profileOpenMarket')}
              </a>
            )}
          </div>
        </div>

        {profile && (
          <div className="profile-stats-grid profile-stats-grid-symmetric">
            <div className="profile-stats-row profile-stats-row-money">
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileBalance')}</span>
                <MoneyValue value={profile.balance} className="profile-stat-value" />
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileHold')}</span>
                <MoneyValue value={profile.hold} className="profile-stat-value profile-stat-value-muted" />
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileAvailable')}</span>
                <MoneyValue value={availableBalance} className="profile-stat-value profile-stat-value-accent" />
              </div>
            </div>
            <div className="profile-stats-row profile-stats-row-counts">
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileActiveItems')}</span>
                <span className="profile-stat-value profile-stat-value-count">{profile.activeItems}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileSoldItems')}</span>
                <span className="profile-stat-value profile-stat-value-count">{profile.soldItems}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">{t('settings.profileTotalItems')}</span>
                <span className="profile-stat-value profile-stat-value-count">{profile.activeItems + profile.soldItems}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title={t('settings.profileDetails')} className="card-main profile-account-card">
        <dl className="profile-details">
          <div className="profile-detail-row">
            <dt>{t('settings.profileUserId')}</dt>
            <dd>{profile?.userId ?? '—'}</dd>
          </div>
          <div className="profile-detail-row">
            <dt>{t('settings.accountName')}</dt>
            <dd>{profile?.username ?? account?.name ?? '—'}</dd>
          </div>
          <div className="profile-detail-row">
            <dt>{t('settings.profileConnected')}</dt>
            <dd>{account ? new Date(account.created_at).toLocaleString() : '—'}</dd>
          </div>
          <div className="profile-detail-row">
            <dt>{t('settings.profileToken')}</dt>
            <dd><code className="profile-token">{token ? maskToken(token) : '—'}</code></dd>
          </div>
        </dl>

        <div className="profile-activity-block">
          <h3 className="profile-activity-title">{t('settings.profileActivity')}</h3>
          <div className="profile-activity-grid">
            {uploadEnabled && (
              <div className="profile-activity-item">
                <span className="profile-activity-value">{stats?.uploadHistory ?? 0}</span>
                <span className="profile-activity-label">{t('settings.profileUploads')}</span>
              </div>
            )}
            {resellerEnabled && (
              <div className="profile-activity-item">
                <span className="profile-activity-value">{stats?.dealsCount ?? 0}</span>
                <span className="profile-activity-label">{t('settings.profileDeals')}</span>
              </div>
            )}
            {buyerEnabled && (
              <div className="profile-activity-item">
                <span className="profile-activity-value">{stats?.watchlistCount ?? 0}</span>
                <span className="profile-activity-label">{t('settings.profileWatchlist')}</span>
              </div>
            )}
            {automationEnabled && (
              <div className="profile-activity-item">
                <span className="profile-activity-value">{stats?.tasksCount ?? 0}</span>
                <span className="profile-activity-label">{t('settings.profileTasks')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-account-actions">
          <Button onClick={openAuthModal}>{t('settings.profileReauth')}</Button>
          <Button variant="secondary" onClick={() => void refreshProfileData()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : undefined} />
            {refreshing ? t('settings.profileLoading') : t('settings.profileRefresh')}
          </Button>
          <Button variant="danger" onClick={() => void logout()}>{t('settings.logout')}</Button>
        </div>
      </Card>
    </div>
  )

  return (
    <PageLayout
      title={t('settings.accountTitle')}
      subtitle={profile?.username ?? account?.name ?? t('settings.noAccountsHint')}
      badge={
        token ? undefined : (
          <span className="settings-hub-badge is-off">{t('settings.noToken')}</span>
        )
      }
      main={main}
    />
  )
}
