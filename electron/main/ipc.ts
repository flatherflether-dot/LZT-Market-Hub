import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { copyFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getActiveToken, getDatabase, getSetting } from './database'
import { forumGetMe, forumFindUser, lztMarketFetch, sendTelegram } from './lzt-api'
import { encryptAes128 } from './crypto-helper'
import {
  startBackgroundMonitor,
  stopBackgroundMonitor,
  restartBackgroundMonitor,
  isMonitorRunning
} from './monitor'
import { startScheduler, getLastRateLimit, setLastRateLimit } from './scheduler'
import { isModuleEnabled, saveModulesEnabled } from './modules-config'
import { isDemoToken, mockForumProfile, mockMarketFetch, seedDemoData } from './demo-data'
import { formatMarketText } from './market-text'
import { fireWebhook } from './webhook-helper'
import {
  getCompetitorWatchlist,
  addCompetitorWatch,
  removeCompetitorWatch,
  setCompetitorWatchEnabled,
  syncCompetitorListings,
  syncAllCompetitors,
  getCompetitorListingsFromDb,
  getListingMatches,
  enrichListingTracking
} from './competitor-service'
import {
  getInvoiceWebhookLogs,
  getInvoiceWebhookPublicUrl,
  isInvoiceWebhookRunning,
  restartInvoiceWebhookServer,
  testInvoiceWebhookLocally
} from './invoice-webhook-server'

function getDbPath(): string {
  return join(app.getPath('userData'), 'lzt-market-hub.db')
}

export function registerIpcHandlers(): void {
  ipcMain.handle('db:get-setting', (_e, key: string) => {
    const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  })

  ipcMain.handle('db:set-setting', (_e, key: string, value: string) => {
    getDatabase()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
      .run(key, value, value)
    return true
  })

  ipcMain.handle('db:get-accounts', () => {
    return getDatabase().prepare('SELECT id, name, is_active, created_at FROM accounts ORDER BY id').all()
  })

  ipcMain.handle('db:add-account', (_e, name: string, token: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM accounts').run()
    return db.prepare('INSERT INTO accounts (name, token, is_active) VALUES (?, ?, 1)').run(name, token)
      .lastInsertRowid
  })

  ipcMain.handle('db:delete-account', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:logout', () => {
    getDatabase().prepare('DELETE FROM accounts').run()
    return true
  })

  ipcMain.handle('db:get-active-token', () => {
    const db = getDatabase()
    const row = db.prepare('SELECT token FROM accounts WHERE is_active = 1 LIMIT 1').get() as
      | { token: string }
      | undefined
    if (row?.token) return row.token
    const fallback = db.prepare('SELECT token FROM accounts ORDER BY id LIMIT 1').get() as
      | { token: string }
      | undefined
    return fallback?.token ?? null
  })

  ipcMain.handle('db:set-active-account', (_e, id: number) => {
    const db = getDatabase()
    db.prepare('UPDATE accounts SET is_active = 0').run()
    db.prepare('UPDATE accounts SET is_active = 1 WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:log-activity', (_e, module: string, action: string, details?: string) => {
    getDatabase()
      .prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)')
      .run(module, action, details ?? null)
    return true
  })

  ipcMain.handle('db:get-activity-log', (_e, limit = 100) => {
    return getDatabase().prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?').all(limit)
  })

  ipcMain.handle('db:get-watch-filters', () => {
    return getDatabase().prepare('SELECT * FROM watch_filters ORDER BY id').all()
  })

  ipcMain.handle('db:save-watch-filter', (_e, filter: {
    id?: number
    name: string
    category: string
    params_json: string
    is_enabled: number
  }) => {
    const db = getDatabase()
    if (filter.id) {
      db.prepare(
        'UPDATE watch_filters SET name=?, category=?, params_json=?, is_enabled=? WHERE id=?'
      ).run(filter.name, filter.category, filter.params_json, filter.is_enabled, filter.id)
      return filter.id
    }
    return db
      .prepare('INSERT INTO watch_filters (name, category, params_json, is_enabled) VALUES (?,?,?,?)')
      .run(filter.name, filter.category, filter.params_json, filter.is_enabled).lastInsertRowid
  })

  ipcMain.handle('db:delete-watch-filter', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM watch_filters WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:get-imap-configs', () => {
    return getDatabase()
      .prepare('SELECT domain, imap_host, imap_port, imap_ssl, updated_at FROM imap_configs ORDER BY domain')
      .all()
  })

  ipcMain.handle(
    'db:save-imap-config',
    (
      _e,
      config: { domain: string; imap_host: string; imap_port: number; imap_ssl: number }
    ) => {
      getDatabase()
        .prepare(
          `INSERT INTO imap_configs (domain, imap_host, imap_port, imap_ssl, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(domain) DO UPDATE SET
             imap_host = excluded.imap_host,
             imap_port = excluded.imap_port,
             imap_ssl = excluded.imap_ssl,
             updated_at = datetime('now')`
        )
        .run(config.domain, config.imap_host, config.imap_port, config.imap_ssl)
      return true
    }
  )

  ipcMain.handle('db:delete-imap-config', (_e, domain: string) => {
    getDatabase().prepare('DELETE FROM imap_configs WHERE domain = ?').run(domain)
    return true
  })

  ipcMain.handle('db:get-deals', () => {
    return getDatabase().prepare('SELECT * FROM deals ORDER BY id DESC').all()
  })

  ipcMain.handle('db:add-deal', (_e, deal: {
    item_id?: number
    category?: string
    action: string
    buy_price?: number
    sell_price?: number
    margin?: number
    notes?: string
    transfer_to?: string
    source?: string
    parent_deal_id?: number
  }) => {
    return getDatabase()
      .prepare(
        'INSERT INTO deals (item_id, category, action, buy_price, sell_price, margin, notes, transfer_to, source, parent_deal_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
      )
      .run(
        deal.item_id ?? null,
        deal.category ?? null,
        deal.action,
        deal.buy_price ?? null,
        deal.sell_price ?? null,
        deal.margin ?? null,
        deal.notes ?? null,
        deal.transfer_to ?? null,
        deal.source ?? 'flip',
        deal.parent_deal_id ?? null
      ).lastInsertRowid
  })

  ipcMain.handle('db:delete-deal', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM deals WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:get-tasks', () => {
    return getDatabase().prepare('SELECT * FROM scheduled_tasks ORDER BY id DESC').all()
  })

  ipcMain.handle('db:save-task', (_e, task: {
    id?: number
    name: string
    type: string
    config_json: string
    interval_minutes: number
    is_enabled: number
  }) => {
    const db = getDatabase()
    if (task.id) {
      db.prepare(
        'UPDATE scheduled_tasks SET name=?, type=?, config_json=?, interval_minutes=?, is_enabled=? WHERE id=?'
      ).run(task.name, task.type, task.config_json, task.interval_minutes, task.is_enabled, task.id)
      return task.id
    }
    return db
      .prepare(
        'INSERT INTO scheduled_tasks (name, type, config_json, interval_minutes, is_enabled) VALUES (?,?,?,?,?)'
      )
      .run(task.name, task.type, task.config_json, task.interval_minutes, task.is_enabled).lastInsertRowid
  })

  ipcMain.handle('db:delete-task', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:get-watchlist', () => {
    const rows = getDatabase().prepare('SELECT * FROM watchlist ORDER BY id DESC').all() as Array<{
      id: number
      item_id: number
      title: unknown
      price: number | null
      target_price: number | null
      created_at: string
    }>
    return rows.map((row) => ({
      ...row,
      title: formatMarketText(row.title) || null
    }))
  })

  ipcMain.handle('db:add-watchlist', (_e, item: {
    item_id: number
    title?: unknown
    price?: number
    target_price?: number
  }) => {
    const title = formatMarketText(item.title) || null
    getDatabase()
      .prepare(
        'INSERT INTO watchlist (item_id, title, price, target_price) VALUES (?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET title=excluded.title, price=excluded.price, target_price=excluded.target_price'
      )
      .run(item.item_id, title, item.price ?? null, item.target_price ?? null)
    return true
  })

  ipcMain.handle('db:remove-watchlist', (_e, itemId: number) => {
    getDatabase().prepare('DELETE FROM watchlist WHERE item_id = ?').run(itemId)
    return true
  })

  ipcMain.handle('db:get-upload-history', () => {
    return getDatabase().prepare('SELECT * FROM upload_history ORDER BY id DESC LIMIT 500').all()
  })

  ipcMain.handle('db:add-upload-history', (_e, entry: {
    login: string
    item_id?: number
    category?: string
    status: string
    message?: string
    initial_price?: number
    current_price?: number
  }) => {
    const status = entry.status === 'failed' ? 'error' : entry.status
    const login = entry.login.trim() || '—'
    const initialPrice = entry.initial_price ?? null
    const currentPrice = entry.current_price ?? entry.initial_price ?? null
    return getDatabase()
      .prepare(
        'INSERT INTO upload_history (login, item_id, category, status, message, initial_price, current_price, price_updated_at) VALUES (?,?,?,?,?,?,?,?)'
      )
      .run(
        login,
        entry.item_id ?? null,
        entry.category ?? null,
        status,
        entry.message ?? null,
        initialPrice,
        currentPrice,
        currentPrice != null ? new Date().toISOString() : null
      )
      .lastInsertRowid
  })

  ipcMain.handle(
    'db:update-upload-history-price',
    (_e, itemId: number, price: number) => {
      getDatabase()
        .prepare(
          `UPDATE upload_history SET
            current_price = ?,
            price_updated_at = datetime('now'),
            initial_price = COALESCE(initial_price, ?)
          WHERE item_id = ?`
        )
        .run(price, price, itemId)
      return true
    }
  )

  ipcMain.handle(
    'db:sync-upload-history-prices',
    (_e, updates: Array<{ item_id: number; price: number }>) => {
      if (!updates.length) return true
      const db = getDatabase()
      const stmt = db.prepare(
        `UPDATE upload_history SET
          current_price = ?,
          price_updated_at = datetime('now'),
          initial_price = COALESCE(initial_price, ?)
        WHERE item_id = ?`
      )
      const tx = db.transaction((rows: Array<{ item_id: number; price: number }>) => {
        for (const row of rows) {
          if (!Number.isFinite(row.price) || row.price <= 0) continue
          stmt.run(row.price, row.price, row.item_id)
        }
      })
      tx(updates)
      return true
    }
  )

  ipcMain.handle('db:check-duplicate-login', (_e, login: string) => {
    const normalized = login.trim()
    if (!normalized) return false
    const row = getDatabase()
      .prepare("SELECT 1 FROM upload_history WHERE login = ? AND status = 'success' LIMIT 1")
      .get(normalized)
    return !!row
  })

  ipcMain.handle('db:get-dashboard-stats', () => {
    const db = getDatabase()
    const dealsCount = (db.prepare('SELECT COUNT(*) as c FROM deals').get() as { c: number }).c
    const totalMargin =
      (db.prepare('SELECT COALESCE(SUM(margin),0) as s FROM deals').get() as { s: number }).s ?? 0
    const watchFilters = (db.prepare('SELECT COUNT(*) as c FROM watch_filters').get() as { c: number }).c
    const watchlistCount = (db.prepare('SELECT COUNT(*) as c FROM watchlist').get() as { c: number }).c
    const uploadHistory = (db.prepare('SELECT COUNT(*) as c FROM upload_history').get() as { c: number }).c
    const tasksCount = (db.prepare('SELECT COUNT(*) as c FROM scheduled_tasks WHERE is_enabled=1').get() as { c: number }).c
    return {
      dealsCount,
      totalMargin,
      watchFilters,
      watchlistCount,
      uploadHistory,
      tasksCount,
      monitorRunning: isMonitorRunning()
    }
  })

  ipcMain.handle('db:clear-seen-listings', () => {
    getDatabase().prepare('DELETE FROM seen_listings').run()
    return true
  })

  ipcMain.handle(
    'db:track-listing',
    (_e, itemId: number, price?: number, title?: string, category?: string) => {
      enrichListingTracking(itemId, price ?? null, title, category)
      return true
    }
  )

  ipcMain.handle('db:get-competitor-watchlist', () => getCompetitorWatchlist())

  ipcMain.handle('db:add-competitor-watch', (_e, userId: string, label?: string) =>
    addCompetitorWatch(userId, label)
  )

  ipcMain.handle('db:remove-competitor-watch', (_e, id: number) => {
    removeCompetitorWatch(id)
    return true
  })

  ipcMain.handle('db:set-competitor-watch-enabled', (_e, id: number, enabled: boolean) => {
    setCompetitorWatchEnabled(id, enabled)
    return true
  })

  ipcMain.handle('db:sync-competitor-watch', async (_e, userId: string) => {
    const token = getActiveToken()
    if (!token) throw new Error('No active token')
    return syncCompetitorListings(token, userId)
  })

  ipcMain.handle('db:sync-all-competitors', async () => {
    const token = getActiveToken()
    if (!token) throw new Error('No active token')
    return syncAllCompetitors(token)
  })

  ipcMain.handle('db:get-competitor-listings', (_e, userId: string) =>
    getCompetitorListingsFromDb(userId)
  )

  ipcMain.handle('db:get-listing-matches', (_e, userId?: string) => getListingMatches(userId))

  ipcMain.handle('db:get-listing-count', () => {
    return (getDatabase().prepare('SELECT COUNT(*) as c FROM listing_tracking').get() as { c: number }).c
  })

  ipcMain.handle('db:seed-demo-data', (_e, replace = false) => {
    return seedDemoData({ replace: Boolean(replace) })
  })

  ipcMain.handle('db:get-monitor-rules', () => {
    return getDatabase().prepare('SELECT * FROM monitor_rules ORDER BY priority DESC, id').all()
  })

  ipcMain.handle('db:save-monitor-rule', (_e, rule: {
    id?: number
    name: string
    category?: string | null
    conditions_json: string
    actions_json: string
    is_enabled: number
    priority?: number
  }) => {
    const db = getDatabase()
    if (rule.id) {
      db.prepare(
        'UPDATE monitor_rules SET name=?, category=?, conditions_json=?, actions_json=?, is_enabled=?, priority=? WHERE id=?'
      ).run(rule.name, rule.category ?? null, rule.conditions_json, rule.actions_json, rule.is_enabled, rule.priority ?? 0, rule.id)
      return rule.id
    }
    return db
      .prepare(
        'INSERT INTO monitor_rules (name, category, conditions_json, actions_json, is_enabled, priority) VALUES (?,?,?,?,?,?)'
      )
      .run(rule.name, rule.category ?? null, rule.conditions_json, rule.actions_json, rule.is_enabled, rule.priority ?? 0)
      .lastInsertRowid
  })

  ipcMain.handle('db:delete-monitor-rule', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM monitor_rules WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:get-blacklist', () => {
    return getDatabase().prepare('SELECT * FROM buyer_blacklist ORDER BY id DESC').all()
  })

  ipcMain.handle('db:add-blacklist', (_e, entry: { type: string; value: string }) => {
    getDatabase()
      .prepare('INSERT OR IGNORE INTO buyer_blacklist (type, value) VALUES (?, ?)')
      .run(entry.type, entry.value.trim())
    return true
  })

  ipcMain.handle('db:delete-blacklist', (_e, id: number) => {
    getDatabase().prepare('DELETE FROM buyer_blacklist WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db:get-autobuy-count-today', () => {
    return (getDatabase()
      .prepare("SELECT COUNT(*) as c FROM autobuy_log WHERE date(created_at) = date('now')")
      .get() as { c: number }).c
  })

  ipcMain.handle('db:check-duplicates-batch', (_e, logins: string[]) => {
    const stmt = getDatabase().prepare(
      "SELECT login FROM upload_history WHERE login = ? AND status = 'success' LIMIT 1"
    )
    return logins.map((l) => l.trim()).filter(Boolean).filter((login) => Boolean(stmt.get(login)))
  })

  ipcMain.handle('market:rate-limit', () => getLastRateLimit())

  ipcMain.handle('tools:backup-db', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'lzt-market-hub-backup.db',
      filters: [{ name: 'SQLite', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) return false
    copyFileSync(getDbPath(), result.filePath)
    return true
  })

  ipcMain.handle('tools:restore-db', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'SQLite', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return false
    copyFileSync(result.filePaths[0], getDbPath())
    return true
  })

  ipcMain.handle('tools:export-bundle', async () => {
    const db = getDatabase()
    const bundle = {
      exported_at: new Date().toISOString(),
      version: '1.1.0',
      deals: db.prepare('SELECT * FROM deals').all(),
      activity_log: db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT 5000').all(),
      upload_history: db.prepare('SELECT * FROM upload_history').all(),
      watchlist: db.prepare('SELECT * FROM watchlist').all(),
      monitor_rules: db.prepare('SELECT * FROM monitor_rules').all()
    }
    const result = await dialog.showSaveDialog({
      defaultPath: `lzt-hub-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('modules:apply', (_e, config: Record<string, boolean>) => {
    saveModulesEnabled(config)
    if (config.buyer === false) stopBackgroundMonitor()
    return true
  })

  ipcMain.handle('monitor:start', () => {
    if (!isModuleEnabled('buyer')) return false
    startBackgroundMonitor()
    startScheduler()
    return true
  })

  ipcMain.handle('monitor:stop', () => {
    stopBackgroundMonitor()
    return true
  })

  ipcMain.handle('monitor:restart', () => {
    restartBackgroundMonitor()
    return true
  })

  ipcMain.handle('window:show', () => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.show()
    win?.focus()
    return true
  })

  ipcMain.handle('monitor:status', () => isMonitorRunning())

  ipcMain.handle('export:save-csv', async (_e, filename: string, content: string) => {
    const result = await dialog.showSaveDialog({ defaultPath: filename, filters: [{ name: 'CSV', extensions: ['csv'] }] })
    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle(
    'market:request',
    async (
      _e,
      payload: {
        path: string
        method?: string
        params?: Record<string, string | number | boolean | undefined>
        body?: unknown
        token?: string
      }
    ) => {
      const token = payload.token ?? getActiveToken()
      if (!token) {
        return { status: 401, data: { error: 'API token not configured' }, headers: {} }
      }
      if (isDemoToken(token)) {
        return mockMarketFetch(payload.path, {
          method: payload.method,
          params: payload.params,
          body: payload.body
        })
      }
      try {
        const result = await lztMarketFetch(token, payload.path, {
          method: payload.method,
          params: payload.params,
          body: payload.body
        })
        const limit = result.headers['X-RateLimit-Limit']
        const remaining = result.headers['X-RateLimit-Remaining']
        const reset = result.headers['X-RateLimit-Reset']
        const bodyRl = (result.data as { system_info?: { rate_limit?: { limit?: number; remaining?: number; reset?: number; bucket?: string } } })
          ?.system_info?.rate_limit
        if (bodyRl?.limit !== undefined && bodyRl.remaining !== undefined && bodyRl.reset !== undefined) {
          setLastRateLimit({
            limit: bodyRl.limit,
            remaining: bodyRl.remaining,
            reset: bodyRl.reset,
            bucket: bodyRl.bucket
          })
        } else if (limit && remaining && reset) {
          setLastRateLimit({ limit: Number(limit), remaining: Number(remaining), reset: Number(reset) })
        }
        return result
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Network error'
        return { status: 0, data: { error: message }, headers: {} }
      }
    }
  )

  ipcMain.handle('forum:get-me', async (_e, token: string) => {
    if (isDemoToken(token)) {
      return mockForumProfile()
    }
    try {
      return await forumGetMe(token)
    } catch {
      return null
    }
  })

  ipcMain.handle('forum:find-user', async (_e, username: string) => {
    const token = getActiveToken()
    if (!token) return { user: undefined }
    if (isDemoToken(token)) {
      return { user: { user_id: 1, username: username.trim() } }
    }
    try {
      return await forumFindUser(token, username)
    } catch {
      return { user: undefined }
    }
  })

  ipcMain.handle('crypto:encrypt-aes128', (_e, plain: string, clientSecret: string) => {
    return encryptAes128(plain, clientSecret)
  })

  ipcMain.handle(
    'tools:test-telegram',
    async (_e, payload?: { token?: string; chatId?: string; message?: string }) => {
      const token = payload?.token?.trim() || getSetting('telegram_bot_token')
      const chatId = payload?.chatId?.trim() || getSetting('telegram_chat_id')
      if (!token || !chatId) {
        throw new Error('Telegram bot token and chat ID are required')
      }
      const text = payload?.message ?? '✅ LZT Market Hub — test notification'
      await sendTelegram(token, chatId, text)
      return true
    }
  )

  ipcMain.handle('tools:test-webhook', async () => {
    if (getSetting('webhook_enabled') !== '1') {
      throw new Error('Webhook disabled')
    }
    const url = getSetting('webhook_url')?.trim()
    if (!url) {
      throw new Error('Webhook URL not configured')
    }
    await fireWebhook('new_listing', { test: true, message: 'LZT Market Hub — test webhook' })
    return true
  })

  ipcMain.handle(
    'webhook:fire',
    (_e, event: import('./webhook-helper').WebhookEvent, payload: Record<string, unknown>) => {
      void fireWebhook(event, payload)
      return true
    }
  )

  ipcMain.handle('finance:invoice-webhook-status', () => ({
    running: isInvoiceWebhookRunning(),
    url: getInvoiceWebhookPublicUrl(),
    port: getSetting('invoice_webhook_port') || '8765',
    path: getSetting('invoice_webhook_path') || '/invoice/callback',
    enabled: getSetting('invoice_webhook_enabled') === '1',
    autoDeal: getSetting('invoice_webhook_auto_deal') === '1'
  }))

  ipcMain.handle('finance:invoice-webhook-restart', () => {
    restartInvoiceWebhookServer()
    return { running: isInvoiceWebhookRunning(), url: getInvoiceWebhookPublicUrl() }
  })

  ipcMain.handle('finance:invoice-webhook-logs', (_e, limit?: number) => {
    return getInvoiceWebhookLogs(limit ?? 50)
  })

  ipcMain.handle('finance:invoice-webhook-test', async () => {
    if (!isInvoiceWebhookRunning()) {
      throw new Error('Invoice webhook server is not running')
    }
    await testInvoiceWebhookLocally()
    return true
  })
}
