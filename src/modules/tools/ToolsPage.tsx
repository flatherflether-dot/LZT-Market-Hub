import { useEffect, useMemo, useState, useCallback } from 'react'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { getApiClient, LztApiError } from '@core/api-client'
import { useAutoRefresh } from '@core/use-auto-refresh'
import type { ActivityLogEntry, ImapConfigEntry, UploadHistoryEntry } from '@renderer/types/database'
import type { MarketItem, MarketTag } from '@core/constants'
import { downloadCsv, toCsv } from '@core/export-csv'
import { useTranslation } from '@core/i18n'
import { isBridgeActive } from '@core/module-registry'
import { useModulesHelpers } from '@core/modules-store'
import { notify } from '@core/ui-store'
import { parseImapListResponse } from '@core/imap-utils'
import { ToolsIntegrationsTab } from '@modules/tools/ToolsIntegrationsTab'
import { ToolsUtilitiesTab } from '@modules/tools/ToolsUtilitiesTab'
import { ToolsActivityTab } from '@modules/tools/ToolsActivityTab'

type ToolsTab = 'integrations' | 'utilities' | 'activity'

const TOOLS_TABS = ['integrations', 'utilities', 'activity'] as const

const WEBHOOK_EVENT_KEYS = [
  'new_listing',
  'price_alert',
  'autobuy',
  'deal',
  'task_failed',
  'competitor_undercut',
  'upload_complete',
  'claim',
  'invoice_paid'
] as const

function isWebhookEventVisible(
  event: (typeof WEBHOOK_EVENT_KEYS)[number],
  enabled: Record<string, boolean>
): boolean {
  switch (event) {
    case 'new_listing':
    case 'price_alert':
    case 'autobuy':
      return enabled.buyer !== false
    case 'deal':
    case 'claim':
      return enabled.reseller !== false
    case 'task_failed':
      return enabled.automation !== false
    case 'competitor_undercut':
      return isBridgeActive('competitor_tracking', enabled)
    case 'upload_complete':
      return enabled.upload !== false
    case 'invoice_paid':
      return enabled.finance !== false
    default:
      return true
  }
}

export function ToolsPage(): React.ReactNode {
  const { t } = useTranslation()
  const { isEnabled, enabled, filterActivity, hasAnyModule } = useModulesHelpers()
  const uploadEnabled = isEnabled('upload')
  const buyerEnabled = isEnabled('buyer')
  const [tab] = useQueryTab<ToolsTab>('tab', 'integrations', TOOLS_TABS)
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTagId, setSearchTagId] = useState('')
  const [marketTags, setMarketTags] = useState<MarketTag[]>([])
  const [searchResults, setSearchResults] = useState<MarketItem[]>([])
  const [dupLogin, setDupLogin] = useState('')
  const [dupResult, setDupResult] = useState<'duplicate' | 'new' | null>(null)
  const [proxyList, setProxyList] = useState('')
  const [toolsStatus, setToolsStatus] = useState<string | null>(null)
  const [imapDomain, setImapDomain] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [imapSsl, setImapSsl] = useState(true)
  const [imapConfigs, setImapConfigs] = useState<ImapConfigEntry[]>([])
  const [selectedImapDomain, setSelectedImapDomain] = useState<string | null>(null)
  const [imapLoading, setImapLoading] = useState(false)
  const [imapSaving, setImapSaving] = useState(false)
  const [itemIdInput, setItemIdInput] = useState('')
  const [itemLookup, setItemLookup] = useState<MarketItem | null>(null)
  const [telegramTesting, setTelegramTesting] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<string[]>([
    'new_listing', 'price_alert', 'autobuy', 'deal', 'task_failed', 'competitor_undercut', 'upload_complete', 'claim', 'invoice_paid'
  ])
  const [webhookTesting, setWebhookTesting] = useState(false)

  const telegramConfigured = Boolean(botToken.trim() && chatId.trim())
  const proxyLineCount = proxyList.split('\n').filter((line) => line.trim()).length

  const visibleWebhookEvents = useMemo(
    () => WEBHOOK_EVENT_KEYS.filter((ev) => isWebhookEventVisible(ev, enabled)),
    [enabled]
  )
  const webhookSectionVisible = visibleWebhookEvents.length > 0

  const visibleActivity = useMemo(() => filterActivity(activity), [activity, filterActivity])

  useEffect(() => {
    void refresh()
  }, [uploadEnabled, buyerEnabled])

  async function refresh(): Promise<void> {
    const log = await window.api.db.getActivityLog(200)
    setActivity(log)
    setBotToken((await window.api.db.getSetting('telegram_bot_token')) ?? '')
    setChatId((await window.api.db.getSetting('telegram_chat_id')) ?? '')
    setWebhookUrl((await window.api.db.getSetting('webhook_url')) ?? '')
    setWebhookEnabled((await window.api.db.getSetting('webhook_enabled')) === '1')
    const eventsRaw = await window.api.db.getSetting('webhook_events')
    if (eventsRaw) {
      try {
        setWebhookEvents(JSON.parse(eventsRaw) as string[])
      } catch {

      }
    }
    try {
      const { data } = await getApiClient().listTags()
      setMarketTags(data.tags ?? [])
    } catch {
      setMarketTags([])
    }
    await loadImapConfigs(false)
  }

  const backgroundRefresh = useCallback(async (): Promise<void> => {
    await refresh()
    if (uploadEnabled) await loadImapConfigs(true)
  }, [uploadEnabled])

  useAutoRefresh(() => backgroundRefresh(), [backgroundRefresh])

  function resetImapForm(): void {
    setSelectedImapDomain(null)
    setImapDomain('')
    setImapHost('')
    setImapPort('993')
    setImapSsl(true)
  }

  function selectImapConfig(config: ImapConfigEntry): void {
    setSelectedImapDomain(config.domain)
    setImapDomain(config.domain)
    setImapHost(config.imap_host)
    setImapPort(String(config.imap_port))
    setImapSsl(config.imap_ssl !== 0)
  }

  async function loadImapConfigs(syncRemote = true): Promise<void> {
    setImapLoading(true)
    try {
      if (syncRemote) {
        try {
          const { data } = await getApiClient().listImap<unknown>()
          const remote = parseImapListResponse(data)
          await Promise.all(
            remote.map((config) =>
              window.api.db.saveImapConfig({
                domain: config.domain,
                imap_host: config.imap_host,
                imap_port: config.imap_port,
                imap_ssl: config.imap_ssl
              })
            )
          )
        } catch {

        }
      }
      const local = await window.api.db.getImapConfigs()
      setImapConfigs(local)
    } finally {
      setImapLoading(false)
    }
  }

  async function saveTelegram(): Promise<void> {
    await window.api.db.setSetting('telegram_bot_token', botToken.trim())
    await window.api.db.setSetting('telegram_chat_id', chatId.trim())
    await window.api.db.logActivity('tools', 'telegram_configured')
    notify(t('tools.telegramTitle'), t('tools.telegramSaved'), 'success')
    void refresh()
  }

  async function testTelegram(): Promise<void> {
    setTelegramTesting(true)
    try {
      await window.api.tools.testTelegram({
        token: botToken.trim(),
        chatId: chatId.trim(),
        message: '✅ LZT Market Hub — test notification'
      })
      notify(t('tools.telegramTitle'), t('tools.telegramTestOk'), 'success')
    } catch (e) {
      notify(
        t('tools.telegramTitle'),
        e instanceof Error ? e.message : t('tools.telegramTestFailed'),
        'error'
      )
    } finally {
      setTelegramTesting(false)
    }
  }

  async function saveWebhook(): Promise<void> {
    await window.api.db.setSetting('webhook_url', webhookUrl.trim())
    await window.api.db.setSetting('webhook_enabled', webhookEnabled ? '1' : '0')
    await window.api.db.setSetting('webhook_events', JSON.stringify(webhookEvents))
    await window.api.db.logActivity('tools', 'webhook_configured')
    notify(t('tools.webhookTitle'), t('tools.webhookSaved'), 'success')
  }

  async function testWebhook(): Promise<void> {
    setWebhookTesting(true)
    try {
      await window.api.tools.testWebhook()
      notify(t('tools.webhookTitle'), t('tools.webhookTestOk'), 'success')
    } catch (e) {
      notify(t('tools.webhookTitle'), e instanceof Error ? e.message : t('tools.webhookTestFailed'), 'error')
    } finally {
      setWebhookTesting(false)
    }
  }

  function toggleWebhookEvent(event: string): void {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  async function searchMyItems(): Promise<void> {
    try {
      const client = getApiClient()
      const { data: prof } = await client.getProfile<{ user?: { user_id: number } }>()
      if (!prof.user?.user_id) return
      const { data } = await client.getMyItems<{ items: MarketItem[] }>(prof.user.user_id, {
        title: searchQuery,
        ...(searchTagId ? { tag_id: Number(searchTagId) } : {}),
        page: 1
      })
      setSearchResults(data.items ?? [])
    } catch (e) {
      notify(t('tools.searchFailed'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  async function lookupItem(): Promise<void> {
    const id = Number(itemIdInput)
    if (!Number.isFinite(id) || id <= 0) return
    try {
      const { data } = await getApiClient().getItem<{ item?: MarketItem } & MarketItem>(id)
      const item = 'item' in data && data.item ? data.item : (data as MarketItem)
      if (!item?.item_id) throw new Error('Item not found')
      setItemLookup(item)
    } catch (e) {
      setItemLookup(null)
      notify(
        t('tools.itemLookupTitle'),
        e instanceof LztApiError ? e.message : t('tools.itemLookupFailed'),
        'error'
      )
    }
  }

  async function checkDuplicate(): Promise<void> {
    const dup = await window.api.db.checkDuplicateLogin(dupLogin.trim())
    setDupResult(dup ? 'duplicate' : 'new')
  }

  function exportActivity(): void {
    downloadCsv(
      'activity-log.csv',
      toCsv(visibleActivity as unknown as Record<string, unknown>[], ['module', 'action', 'details', 'created_at'])
    )
  }

  async function exportUploadHistory(): Promise<void> {
    const history = await window.api.db.getUploadHistory()
    downloadCsv(
      'upload-history.csv',
      toCsv(history as unknown as Record<string, unknown>[], [
        'login',
        'item_id',
        'category',
        'status',
        'message',
        'created_at'
      ] satisfies (keyof UploadHistoryEntry)[])
    )
  }

  function exportSearchResults(): void {
    if (searchResults.length === 0) return
    downloadCsv(
      'search-results.csv',
      toCsv(searchResults as unknown as Record<string, unknown>[], ['item_id', 'title', 'price', 'item_state'])
    )
  }

  async function uploadProxies(): Promise<void> {
    try {
      await getApiClient().addProxy({ proxy_row: proxyList })
      setToolsStatus(t('tools.proxiesUploaded'))
      await window.api.db.logActivity('tools', 'proxy_upload', String(proxyLineCount))
      void refresh()
    } catch (e) {
      setToolsStatus(e instanceof LztApiError ? e.message : t('tools.proxyUploadFailed'))
    }
  }

  async function loadProxies(): Promise<void> {
    try {
      const { data } = await getApiClient().getProxies<{ proxies?: unknown[] }>()
      const count = Array.isArray(data) ? data.length : data.proxies?.length ?? 0
      setToolsStatus(t('tools.proxiesLoaded', { count }))
    } catch (e) {
      setToolsStatus(e instanceof LztApiError ? e.message : t('tools.proxiesLoadFailed'))
    }
  }

  async function saveImap(): Promise<void> {
    const domain = imapDomain.trim().toLowerCase()
    const host = imapHost.trim()
    if (!domain || !host) return
    setImapSaving(true)
    try {
      await getApiClient().createImap({
        domain,
        imap_host: host,
        imap_port: Number(imapPort) || 993,
        imap_ssl: imapSsl
      })
      await window.api.db.saveImapConfig({
        domain,
        imap_host: host,
        imap_port: Number(imapPort) || 993,
        imap_ssl: imapSsl ? 1 : 0
      })
      setToolsStatus(t('tools.imapSaved', { domain }))
      await window.api.db.logActivity('tools', 'imap_create', domain)
      setSelectedImapDomain(domain)
      await loadImapConfigs(false)
      notify(t('tools.imapTitle'), t('tools.imapSaved', { domain }), 'success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('tools.imapFailed')
      setToolsStatus(message)
      notify(t('tools.imapTitle'), message, 'error')
    } finally {
      setImapSaving(false)
    }
  }

  async function deleteImapConfig(domainToDelete?: string): Promise<void> {
    const domain = (domainToDelete ?? imapDomain).trim().toLowerCase()
    if (!domain) return
    setImapSaving(true)
    try {
      await getApiClient().deleteImap(domain)
      await window.api.db.deleteImapConfig(domain)
      setToolsStatus(t('tools.imapDeleted', { domain }))
      if (selectedImapDomain === domain) resetImapForm()
      await loadImapConfigs(false)
      notify(t('tools.imapTitle'), t('tools.imapDeleted', { domain }), 'success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('tools.imapDeleteFailed')
      setToolsStatus(message)
      notify(t('tools.imapTitle'), message, 'error')
    } finally {
      setImapSaving(false)
    }
  }

  const integrationsMain = (
    <ToolsIntegrationsTab
      botToken={botToken}
      setBotToken={setBotToken}
      chatId={chatId}
      setChatId={setChatId}
      telegramConfigured={telegramConfigured}
      telegramTesting={telegramTesting}
      onSaveTelegram={() => void saveTelegram()}
      onTestTelegram={() => void testTelegram()}
      webhookSectionVisible={webhookSectionVisible}
      webhookEnabled={webhookEnabled}
      setWebhookEnabled={setWebhookEnabled}
      webhookUrl={webhookUrl}
      setWebhookUrl={setWebhookUrl}
      webhookEvents={webhookEvents}
      visibleWebhookEvents={visibleWebhookEvents}
      toggleWebhookEvent={toggleWebhookEvent}
      webhookTesting={webhookTesting}
      onSaveWebhook={() => void saveWebhook()}
      onTestWebhook={() => void testWebhook()}
      uploadEnabled={uploadEnabled}
      imapConfigs={imapConfigs}
      selectedImapDomain={selectedImapDomain}
      imapDomain={imapDomain}
      setImapDomain={setImapDomain}
      imapHost={imapHost}
      setImapHost={setImapHost}
      imapPort={imapPort}
      setImapPort={setImapPort}
      imapSsl={imapSsl}
      setImapSsl={setImapSsl}
      imapLoading={imapLoading}
      imapSaving={imapSaving}
      toolsStatus={toolsStatus}
      onResetImapForm={resetImapForm}
      onLoadImapConfigs={() => void loadImapConfigs()}
      onSelectImapConfig={selectImapConfig}
      onDeleteImapConfig={(domain) => void deleteImapConfig(domain)}
      onSaveImap={() => void saveImap()}
    />
  )

  const utilitiesMain = (
    <ToolsUtilitiesTab
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchTagId={searchTagId}
      setSearchTagId={setSearchTagId}
      marketTags={marketTags}
      searchResults={searchResults}
      onSearch={searchMyItems}
      onExportSearch={exportSearchResults}
      itemIdInput={itemIdInput}
      setItemIdInput={setItemIdInput}
      itemLookup={itemLookup}
      onLookupItem={lookupItem}
      dupLogin={dupLogin}
      setDupLogin={(v) => {
        setDupLogin(v)
        setDupResult(null)
      }}
      dupResult={dupResult}
      onCheckDuplicate={checkDuplicate}
      uploadEnabled={uploadEnabled}
      buyerEnabled={buyerEnabled}
      proxyList={proxyList}
      setProxyList={setProxyList}
      proxyLineCount={proxyLineCount}
      onUploadProxies={uploadProxies}
      onLoadProxies={loadProxies}
      onBackupDb={() => void window.api.tools.backupDb().then((ok) => ok && setToolsStatus(t('tools.backupOk')))}
      onRestoreDb={() => void window.api.tools.restoreDb().then((ok) => ok && setToolsStatus(t('tools.restoreOk')))}
      onExportBundle={() => void window.api.tools.exportBundle().then((ok) => ok && setToolsStatus(t('tools.exportBundleOk')))}
      onExportActivity={exportActivity}
      onExportUploadHistory={exportUploadHistory}
      onResetSeenCache={() =>
        void window.api.db.clearSeenListings().then(() => {
          notify(t('nav.buyer'), t('tools.seenCacheCleared'), 'success')
          void refresh()
        })
      }
      toolsStatus={tab === 'utilities' ? toolsStatus : null}
    />
  )

  const activityMain = (
    <ToolsActivityTab
      activity={visibleActivity}
      hasAnyModule={hasAnyModule}
    />
  )

  const mainByTab: Record<ToolsTab, React.ReactNode> = {
    integrations: integrationsMain,
    utilities: utilitiesMain,
    activity: activityMain
  }

  const tabDescriptions: Record<ToolsTab, string> = {
    integrations: t('tools.integrationsDesc'),
    utilities: t('tools.utilitiesDesc'),
    activity: t('tools.activityDesc')
  }

  return (
    <PageLayout
      title={t('tools.title')}
      subtitle={tabDescriptions[tab]}
      badge={
        <span className="tools-hub-badge">
          {activity.length} {t('common.entries')}
        </span>
      }
      main={mainByTab[tab]}
    />
  )
}
