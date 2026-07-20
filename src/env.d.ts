/// <reference types="vite/client" />

import type {
  ActivityLogEntry,
  BlacklistEntry,
  DashboardStats,
  Deal,
  DealInput,
  MonitorRule,
  MonitorRuleInput,
  RateLimitInfo,
  ScheduledTask,
  ScheduledTaskInput,
  UploadHistoryEntry,
  WatchFilter,
  WatchFilterInput,
  WatchlistItem
} from './types/database'

export interface AppApi {
  monitor: {
    start: () => Promise<boolean>
    stop: () => Promise<boolean>
    restart: () => Promise<boolean>
    status: () => Promise<boolean>
  }
  export: {
    saveCsv: (filename: string, content: string) => Promise<boolean>
  }
  tools: {
    testTelegram: (payload?: { token?: string; chatId?: string; message?: string }) => Promise<boolean>
    testWebhook: () => Promise<boolean>
    backupDb: () => Promise<boolean>
    restoreDb: () => Promise<boolean>
    exportBundle: () => Promise<boolean>
  }
  window: {
    show: () => Promise<boolean>
  }
  webhook: {
    fire: (event: string, payload: Record<string, unknown>) => Promise<boolean>
  }
  finance: {
    invoiceWebhookStatus: () => Promise<{
      running: boolean
      url: string
      port: string
      path: string
      enabled: boolean
      autoDeal: boolean
    }>
    invoiceWebhookRestart: () => Promise<{ running: boolean; url: string }>
    invoiceWebhookLogs: (limit?: number) => Promise<
      Array<{ id: number; payload_json: string; payment_key: string | null; created_at: string }>
    >
    invoiceWebhookTest: () => Promise<boolean>
  }
  market: {
    request: (
      path: string,
      options?: {
        method?: string
        params?: Record<string, string | number | boolean | undefined>
        body?: unknown
        token?: string
      }
    ) => Promise<{ status: number; data: unknown; headers: Record<string, string> }>
    getForumProfile: (token: string) => Promise<unknown>
    getRateLimit: () => Promise<RateLimitInfo | null>
  }
  forum: {
    findUser: (username: string) => Promise<{ user?: { user_id: number; username: string } }>
  }
  crypto: {
    encryptAes128: (plain: string, clientSecret: string) => Promise<string>
  }
  db: {
    getSetting: (key: string) => Promise<string | null>
    setSetting: (key: string, value: string) => Promise<boolean>
    getAccounts: () => Promise<Array<{ id: number; name: string; is_active: number; created_at: string }>>
    addAccount: (name: string, token: string) => Promise<number>
    deleteAccount: (id: number) => Promise<boolean>
    logout: () => Promise<boolean>
    getActiveToken: () => Promise<string | null>
    setActiveAccount: (id: number) => Promise<boolean>
    logActivity: (module: string, action: string, details?: string) => Promise<boolean>
    getActivityLog: (limit?: number) => Promise<ActivityLogEntry[]>
    getWatchFilters: () => Promise<WatchFilter[]>
    saveWatchFilter: (filter: WatchFilterInput) => Promise<number>
    deleteWatchFilter: (id: number) => Promise<boolean>
    getImapConfigs: () => Promise<import('./types/database').ImapConfigEntry[]>
    saveImapConfig: (config: {
      domain: string
      imap_host: string
      imap_port: number
      imap_ssl: number
    }) => Promise<boolean>
    deleteImapConfig: (domain: string) => Promise<boolean>
    getDeals: () => Promise<Deal[]>
    addDeal: (deal: DealInput) => Promise<number>
    deleteDeal: (id: number) => Promise<boolean>
    getTasks: () => Promise<ScheduledTask[]>
    saveTask: (task: ScheduledTaskInput) => Promise<number>
    deleteTask: (id: number) => Promise<boolean>
    getWatchlist: () => Promise<WatchlistItem[]>
    addWatchlist: (item: {
      item_id: number
      title?: string
      price?: number
      target_price?: number
    }) => Promise<boolean>
    removeWatchlist: (itemId: number) => Promise<boolean>
    getUploadHistory: () => Promise<UploadHistoryEntry[]>
    addUploadHistory: (entry: {
      login: string
      item_id?: number
      category?: string
      status: string
      message?: string
      initial_price?: number
      current_price?: number
    }) => Promise<number>
    updateUploadHistoryPrice: (itemId: number, price: number) => Promise<boolean>
    syncUploadHistoryPrices: (updates: Array<{ item_id: number; price: number }>) => Promise<boolean>
    checkDuplicateLogin: (login: string) => Promise<boolean>
    getDashboardStats: () => Promise<DashboardStats>
    clearSeenListings: () => Promise<boolean>
    trackListing: (itemId: number, price?: number, title?: string, category?: string) => Promise<boolean>
    getListingCount: () => Promise<number>
    getCompetitorWatchlist: () => Promise<import('@renderer/types/database').CompetitorWatchEntry[]>
    addCompetitorWatch: (userId: string, label?: string) => Promise<number>
    removeCompetitorWatch: (id: number) => Promise<boolean>
    setCompetitorWatchEnabled: (id: number, enabled: boolean) => Promise<boolean>
    syncCompetitorWatch: (userId: string) => Promise<{ count: number; matches: number }>
    syncAllCompetitors: () => Promise<{ synced: number; totalListings: number; totalMatches: number }>
    getCompetitorListings: (userId: string) => Promise<import('@renderer/types/database').StoredCompetitorListing[]>
    getListingMatches: (userId?: string) => Promise<import('@renderer/types/database').StoredListingMatch[]>
    seedDemoData: (replace?: boolean) => Promise<{ seeded: boolean; message: string; counts: Record<string, number> }>
    getMonitorRules: () => Promise<MonitorRule[]>
    saveMonitorRule: (rule: MonitorRuleInput) => Promise<number>
    deleteMonitorRule: (id: number) => Promise<boolean>
    getBlacklist: () => Promise<BlacklistEntry[]>
    addBlacklist: (entry: { type: string; value: string }) => Promise<boolean>
    deleteBlacklist: (id: number) => Promise<boolean>
    getAutobuyCountToday: () => Promise<number>
    checkDuplicatesBatch: (logins: string[]) => Promise<string[]>
  }
  modules: {
    apply: (config: Record<string, boolean>) => Promise<boolean>
  }
}

declare global {
  interface Window {
    api: AppApi
  }
}
