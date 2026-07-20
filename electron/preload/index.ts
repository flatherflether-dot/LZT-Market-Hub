import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ActivityLogEntry,
  BlacklistEntry,
  CompetitorWatchEntry,
  DashboardStats,
  Deal,
  DealInput,
  MonitorRule,
  MonitorRuleInput,
  RateLimitInfo,
  ScheduledTask,
  ScheduledTaskInput,
  StoredCompetitorListing,
  StoredListingMatch,
  UploadHistoryEntry,
  WatchFilter,
  WatchFilterInput,
  WatchlistItem
} from '../../src/types/database'

const api = {
  monitor: {
    start: (): Promise<boolean> => ipcRenderer.invoke('monitor:start'),
    stop: (): Promise<boolean> => ipcRenderer.invoke('monitor:stop'),
    restart: (): Promise<boolean> => ipcRenderer.invoke('monitor:restart'),
    status: (): Promise<boolean> => ipcRenderer.invoke('monitor:status')
  },
  export: {
    saveCsv: (filename: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke('export:save-csv', filename, content)
  },
  tools: {
    testTelegram: (payload?: { token?: string; chatId?: string; message?: string }): Promise<boolean> =>
      ipcRenderer.invoke('tools:test-telegram', payload),
    testWebhook: (): Promise<boolean> => ipcRenderer.invoke('tools:test-webhook'),
    backupDb: (): Promise<boolean> => ipcRenderer.invoke('tools:backup-db'),
    restoreDb: (): Promise<boolean> => ipcRenderer.invoke('tools:restore-db'),
    exportBundle: (): Promise<boolean> => ipcRenderer.invoke('tools:export-bundle')
  },
  window: {
    show: (): Promise<boolean> => ipcRenderer.invoke('window:show')
  },
  webhook: {
    fire: (event: string, payload: Record<string, unknown>): Promise<boolean> =>
      ipcRenderer.invoke('webhook:fire', event, payload)
  },
  finance: {
    invoiceWebhookStatus: (): Promise<{
      running: boolean
      url: string
      port: string
      path: string
      enabled: boolean
      autoDeal: boolean
    }> => ipcRenderer.invoke('finance:invoice-webhook-status'),
    invoiceWebhookRestart: (): Promise<{ running: boolean; url: string }> =>
      ipcRenderer.invoke('finance:invoice-webhook-restart'),
    invoiceWebhookLogs: (limit?: number): Promise<
      Array<{ id: number; payload_json: string; payment_key: string | null; created_at: string }>
    > => ipcRenderer.invoke('finance:invoice-webhook-logs', limit),
    invoiceWebhookTest: (): Promise<boolean> => ipcRenderer.invoke('finance:invoice-webhook-test')
  },
  market: {
    request: (
      path: string,
      options: {
        method?: string
        params?: Record<string, string | number | boolean | undefined>
        body?: unknown
        token?: string
      } = {}
    ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> =>
      ipcRenderer.invoke('market:request', { path, ...options }),
    getForumProfile: (token: string): Promise<unknown> => ipcRenderer.invoke('forum:get-me', token),
    getRateLimit: (): Promise<RateLimitInfo | null> => ipcRenderer.invoke('market:rate-limit')
  },
  forum: {
    findUser: (username: string): Promise<{ user?: { user_id: number; username: string } }> =>
      ipcRenderer.invoke('forum:find-user', username)
  },
  crypto: {
    encryptAes128: (plain: string, clientSecret: string): Promise<string> =>
      ipcRenderer.invoke('crypto:encrypt-aes128', plain, clientSecret)
  },
  db: {
    getSetting: (key: string): Promise<string | null> => ipcRenderer.invoke('db:get-setting', key),
    setSetting: (key: string, value: string): Promise<boolean> =>
      ipcRenderer.invoke('db:set-setting', key, value),
    getAccounts: (): Promise<Array<{ id: number; name: string; is_active: number; created_at: string }>> =>
      ipcRenderer.invoke('db:get-accounts'),
    addAccount: (name: string, token: string): Promise<number> =>
      ipcRenderer.invoke('db:add-account', name, token),
    deleteAccount: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-account', id),
    logout: (): Promise<boolean> => ipcRenderer.invoke('db:logout'),
    getActiveToken: (): Promise<string | null> => ipcRenderer.invoke('db:get-active-token'),
    setActiveAccount: (id: number): Promise<boolean> => ipcRenderer.invoke('db:set-active-account', id),
    logActivity: (module: string, action: string, details?: string): Promise<boolean> =>
      ipcRenderer.invoke('db:log-activity', module, action, details),
    getActivityLog: (limit?: number): Promise<ActivityLogEntry[]> =>
      ipcRenderer.invoke('db:get-activity-log', limit),
    getWatchFilters: (): Promise<WatchFilter[]> => ipcRenderer.invoke('db:get-watch-filters'),
    saveWatchFilter: (filter: WatchFilterInput): Promise<number> =>
      ipcRenderer.invoke('db:save-watch-filter', filter),
    deleteWatchFilter: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-watch-filter', id),
    getImapConfigs: (): Promise<import('../../src/types/database').ImapConfigEntry[]> =>
      ipcRenderer.invoke('db:get-imap-configs'),
    saveImapConfig: (config: {
      domain: string
      imap_host: string
      imap_port: number
      imap_ssl: number
    }): Promise<boolean> => ipcRenderer.invoke('db:save-imap-config', config),
    deleteImapConfig: (domain: string): Promise<boolean> =>
      ipcRenderer.invoke('db:delete-imap-config', domain),
    getDeals: (): Promise<Deal[]> => ipcRenderer.invoke('db:get-deals'),
    addDeal: (deal: DealInput): Promise<number> => ipcRenderer.invoke('db:add-deal', deal),
    deleteDeal: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-deal', id),
    getTasks: (): Promise<ScheduledTask[]> => ipcRenderer.invoke('db:get-tasks'),
    saveTask: (task: ScheduledTaskInput): Promise<number> => ipcRenderer.invoke('db:save-task', task),
    deleteTask: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-task', id),
    getWatchlist: (): Promise<WatchlistItem[]> => ipcRenderer.invoke('db:get-watchlist'),
    addWatchlist: (item: {
      item_id: number
      title?: string
      price?: number
      target_price?: number
    }): Promise<boolean> => ipcRenderer.invoke('db:add-watchlist', item),
    removeWatchlist: (itemId: number): Promise<boolean> => ipcRenderer.invoke('db:remove-watchlist', itemId),
    getUploadHistory: (): Promise<UploadHistoryEntry[]> => ipcRenderer.invoke('db:get-upload-history'),
    addUploadHistory: (entry: {
      login: string
      item_id?: number
      category?: string
      status: string
      message?: string
      initial_price?: number
      current_price?: number
    }): Promise<number> => ipcRenderer.invoke('db:add-upload-history', entry),
    updateUploadHistoryPrice: (itemId: number, price: number): Promise<boolean> =>
      ipcRenderer.invoke('db:update-upload-history-price', itemId, price),
    syncUploadHistoryPrices: (updates: Array<{ item_id: number; price: number }>): Promise<boolean> =>
      ipcRenderer.invoke('db:sync-upload-history-prices', updates),
    checkDuplicateLogin: (login: string): Promise<boolean> =>
      ipcRenderer.invoke('db:check-duplicate-login', login),
    getDashboardStats: (): Promise<DashboardStats> => ipcRenderer.invoke('db:get-dashboard-stats'),
    clearSeenListings: (): Promise<boolean> => ipcRenderer.invoke('db:clear-seen-listings'),
    trackListing: (itemId: number, price?: number, title?: string, category?: string): Promise<boolean> =>
      ipcRenderer.invoke('db:track-listing', itemId, price, title, category),
    getListingCount: (): Promise<number> => ipcRenderer.invoke('db:get-listing-count'),
    getCompetitorWatchlist: (): Promise<CompetitorWatchEntry[]> =>
      ipcRenderer.invoke('db:get-competitor-watchlist'),
    addCompetitorWatch: (userId: string, label?: string): Promise<number> =>
      ipcRenderer.invoke('db:add-competitor-watch', userId, label),
    removeCompetitorWatch: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('db:remove-competitor-watch', id),
    setCompetitorWatchEnabled: (id: number, enabled: boolean): Promise<boolean> =>
      ipcRenderer.invoke('db:set-competitor-watch-enabled', id, enabled),
    syncCompetitorWatch: (userId: string): Promise<{ count: number; matches: number }> =>
      ipcRenderer.invoke('db:sync-competitor-watch', userId),
    syncAllCompetitors: (): Promise<{ synced: number; totalListings: number; totalMatches: number }> =>
      ipcRenderer.invoke('db:sync-all-competitors'),
    getCompetitorListings: (userId: string): Promise<StoredCompetitorListing[]> =>
      ipcRenderer.invoke('db:get-competitor-listings', userId),
    getListingMatches: (userId?: string): Promise<StoredListingMatch[]> =>
      ipcRenderer.invoke('db:get-listing-matches', userId),
    seedDemoData: (replace?: boolean): Promise<{ seeded: boolean; message: string; counts: Record<string, number> }> =>
      ipcRenderer.invoke('db:seed-demo-data', replace),
    getMonitorRules: (): Promise<MonitorRule[]> => ipcRenderer.invoke('db:get-monitor-rules'),
    saveMonitorRule: (rule: MonitorRuleInput): Promise<number> =>
      ipcRenderer.invoke('db:save-monitor-rule', rule),
    deleteMonitorRule: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-monitor-rule', id),
    getBlacklist: (): Promise<BlacklistEntry[]> => ipcRenderer.invoke('db:get-blacklist'),
    addBlacklist: (entry: { type: string; value: string }): Promise<boolean> =>
      ipcRenderer.invoke('db:add-blacklist', entry),
    deleteBlacklist: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-blacklist', id),
    getAutobuyCountToday: (): Promise<number> => ipcRenderer.invoke('db:get-autobuy-count-today'),
    checkDuplicatesBatch: (logins: string[]): Promise<string[]> =>
      ipcRenderer.invoke('db:check-duplicates-batch', logins)
  },
  modules: {
    apply: (config: Record<string, boolean>): Promise<boolean> =>
      ipcRenderer.invoke('modules:apply', config)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-expect-error
  window.electron = electronAPI
  // @ts-expect-error
  window.api = api
}

export type AppApi = typeof api
