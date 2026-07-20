import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@components/PageLayout'
import { useAuthStore } from '@core/auth-store'
import { useQueryTab } from '@core/use-query-tab'
import { useTranslation } from '@core/i18n'
import { useModulesHelpers } from '@core/modules-store'
import { notify } from '@core/ui-store'
import {
  clampAutoRefreshInterval,
  useAutoRefreshStore
} from '@core/auto-refresh-store'
import type { DashboardStats } from '@renderer/types/database'
import { clampMonitorInterval } from '@modules/settings/SettingsGeneralMain'
import { SettingsGeneralMain } from '@modules/settings/SettingsGeneralMain'
import { SettingsGeneralPanel } from '@modules/settings/SettingsGeneralPanel'
import { SettingsMonitorPanel } from '@modules/settings/SettingsMonitorPanel'
import { SettingsModulesMain } from '@modules/settings/SettingsModulesMain'
import { SettingsSecurityMain } from '@modules/settings/SettingsSecurityMain'

type SettingsTab = 'general' | 'modules' | 'security'

const SETTINGS_TABS = ['general', 'modules', 'security'] as const satisfies readonly SettingsTab[]

export function SettingsPage(): React.ReactNode {
  const { token, hydrate } = useAuthStore()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useQueryTab<SettingsTab>('tab', 'general', SETTINGS_TABS)
  const [secretAnswer, setSecretAnswer] = useState('')
  const [secretSaved, setSecretSaved] = useState(false)
  const [oauthClientSecret, setOauthClientSecret] = useState('')
  const [oauthSecretSaved, setOauthSecretSaved] = useState(false)
  const [monitorAutostart, setMonitorAutostart] = useState(false)
  const [monitorRunning, setMonitorRunning] = useState(false)
  const [monitorBusy, setMonitorBusy] = useState(false)
  const [monitorInterval, setMonitorInterval] = useState('3')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState('60')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const { isEnabled } = useModulesHelpers()
  const buyerEnabled = isEnabled('buyer')
  const uploadEnabled = isEnabled('upload')
  const resellerEnabled = isEnabled('reseller')
  const financeEnabled = isEnabled('finance')
  const securityAnyEnabled = uploadEnabled || resellerEnabled || financeEnabled

  useEffect(() => {
    void window.api.db.getSetting('market_secret_answer').then((v) => {
      setSecretAnswer(v ?? '')
      setSecretSaved(Boolean(v))
    })
    void window.api.db.getSetting('oauth_client_secret').then((v) => {
      setOauthClientSecret(v ?? '')
      setOauthSecretSaved(Boolean(v?.trim()))
    })
    void window.api.db.getSetting('monitor_autostart').then((v) => setMonitorAutostart(v === '1'))
    void window.api.db.getSetting('monitor_interval_seconds').then((v) => setMonitorInterval(v ?? '3'))
    void useAutoRefreshStore.getState().hydrate().then(() => {
      const state = useAutoRefreshStore.getState()
      setAutoRefreshEnabled(state.enabled)
      setAutoRefreshInterval(String(state.intervalSeconds))
    })
    void window.api.monitor.status().then(setMonitorRunning)
  }, [])

  useEffect(() => {
    if (tab !== 'general') return
    void window.api.monitor.status().then(setMonitorRunning)
    void window.api.db.getDashboardStats().then(setStats)
  }, [tab])

  useEffect(() => {
    if (!token) {
      setStats(null)
      return
    }
    void window.api.db.getDashboardStats().then(setStats)
  }, [tab, token])

  async function saveSecretAnswer(): Promise<void> {
    await window.api.db.setSetting('market_secret_answer', secretAnswer)
    setSecretSaved(Boolean(secretAnswer.trim()))
    notify(t('nav.settings'), t('settings.secretSaved'), 'success')
  }

  async function saveOauthClientSecret(): Promise<void> {
    await window.api.db.setSetting('oauth_client_secret', oauthClientSecret.trim())
    setOauthSecretSaved(Boolean(oauthClientSecret.trim()))
    notify(t('nav.settings'), t('settings.oauthSecretSaved'), 'success')
  }

  async function saveGeneral(): Promise<void> {
    const previousInterval = await window.api.db.getSetting('monitor_interval_seconds')
    const interval = String(clampAutoRefreshInterval(Number(autoRefreshInterval) || 60))
    useAutoRefreshStore.getState().setIntervalSeconds(Number(interval))
    useAutoRefreshStore.getState().setEnabled(autoRefreshEnabled)
    await useAutoRefreshStore.getState().save()
    setAutoRefreshInterval(interval)

    if (buyerEnabled) {
      await window.api.db.setSetting('monitor_autostart', monitorAutostart ? '1' : '0')
      const monitorSec = String(clampMonitorInterval(Number(monitorInterval) || 3))
      await window.api.db.setSetting('monitor_interval_seconds', monitorSec)
      setMonitorInterval(monitorSec)
      if (monitorRunning && previousInterval !== monitorSec) {
        await window.api.monitor.restart()
      }
    }
    notify(t('nav.settings'), t('settings.settingsSaved'), 'success')
  }

  async function toggleMonitor(): Promise<void> {
    if (monitorBusy) return
    if (!token) {
      notify(t('settings.monitorStatusTitle'), t('settings.monitorNoToken'), 'error')
      return
    }
    setMonitorBusy(true)
    try {
      if (monitorRunning) {
        await window.api.monitor.stop()
        setMonitorRunning(false)
        notify(t('settings.monitorStatusTitle'), t('settings.monitorStoppedToast'), 'info')
      } else {
        await window.api.db.clearSeenListings()
        await window.api.monitor.start()
        setMonitorRunning(true)
        notify(t('settings.monitorStatusTitle'), t('settings.monitorStartedToast'), 'success')
      }
      const nextStats = await window.api.db.getDashboardStats()
      setStats(nextStats)
    } finally {
      setMonitorBusy(false)
    }
  }

  async function loadDemoData(): Promise<void> {
    setDemoLoading(true)
    try {
      const result = await window.api.db.seedDemoData(true)
      if (result.seeded) {
        await hydrate()
        const nextStats = await window.api.db.getDashboardStats()
        setStats(nextStats)
        notify(
          t('settings.demoDataTitle'),
          t('settings.demoDataLoaded', {
            deals: result.counts.deals ?? 0,
            uploads: result.counts.uploads ?? 0,
            activity: result.counts.activity ?? 0
          }),
          'success'
        )
      } else {
        notify(t('settings.demoDataTitle'), t('settings.demoDataSkipped'), 'info')
      }
    } finally {
      setDemoLoading(false)
    }
  }

  const generalAside = (
    <div className="settings-general-aside-stack">
      <SettingsGeneralPanel
        autoRefreshEnabled={autoRefreshEnabled}
        autoRefreshInterval={autoRefreshInterval}
      />
      {buyerEnabled ? (
        <SettingsMonitorPanel
          monitorRunning={monitorRunning}
          monitorBusy={monitorBusy}
          monitorInterval={monitorInterval}
          monitorAutostart={monitorAutostart}
          savedFilters={stats?.watchFilters ?? 0}
          hasToken={Boolean(token)}
          onToggle={toggleMonitor}
        />
      ) : null}
    </div>
  )

  const generalMain = (
    <SettingsGeneralMain
      buyerEnabled={buyerEnabled}
      autoRefreshEnabled={autoRefreshEnabled}
      setAutoRefreshEnabled={setAutoRefreshEnabled}
      autoRefreshInterval={autoRefreshInterval}
      setAutoRefreshInterval={setAutoRefreshInterval}
      monitorInterval={monitorInterval}
      setMonitorInterval={setMonitorInterval}
      monitorAutostart={monitorAutostart}
      setMonitorAutostart={setMonitorAutostart}
      onSave={saveGeneral}
    />
  )

  const securityMain = (
    <SettingsSecurityMain
      securityAnyEnabled={securityAnyEnabled}
      uploadEnabled={uploadEnabled}
      resellerEnabled={resellerEnabled}
      financeEnabled={financeEnabled}
      secretAnswer={secretAnswer}
      setSecretAnswer={setSecretAnswer}
      secretSaved={secretSaved}
      onSaveSecret={saveSecretAnswer}
      oauthClientSecret={oauthClientSecret}
      setOauthClientSecret={setOauthClientSecret}
      oauthSecretSaved={oauthSecretSaved}
      onSaveOauth={saveOauthClientSecret}
      onOpenModules={() => setTab('modules')}
    />
  )

  const modulesMain = (
    <SettingsModulesMain
      showDemo={import.meta.env.DEV}
      demoLoading={demoLoading}
      onLoadDemo={loadDemoData}
    />
  )

  const asideByTab: Partial<Record<SettingsTab, React.ReactNode>> = {
    general: generalAside
  }

  const mainByTab: Record<SettingsTab, React.ReactNode> = {
    general: generalMain,
    modules: modulesMain,
    security: securityMain
  }

  const tabDescriptions: Record<SettingsTab, string> = {
    general: t('settings.generalDesc'),
    modules: t('modules.subtitle'),
    security: t('settings.secretDesc')
  }

  if (searchParams.get('tab') === 'account') {
    return <Navigate to="/account" replace />
  }

  return (
    <PageLayout
      title={t('settings.title')}
      subtitle={tabDescriptions[tab]}
      badge={
        token ? undefined : (
          <span className="settings-hub-badge is-off">{t('settings.noToken')}</span>
        )
      }
      main={mainByTab[tab]}
      aside={asideByTab[tab]}
    />
  )
}
