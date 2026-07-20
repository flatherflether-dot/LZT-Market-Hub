import { getDatabase, getActiveToken } from './database'
import { lztRequest } from './lzt-api'
import { notifyAll } from './notify-helper'
import { computeSmartPrice, getStaleListings, getBuyFloor, type SmartRepriceConfig } from './smart-reprice'
import { isBridgeActive, isModuleEnabled } from './modules-config'
import { syncAllCompetitors, getListingMatches } from './competitor-service'

let schedulerTimer: ReturnType<typeof setInterval> | null = null
let lastRateLimit: { limit: number; remaining: number; reset: number; bucket?: string } | null = null

export function getLastRateLimit(): typeof lastRateLimit {
  return lastRateLimit
}

export function setLastRateLimit(info: typeof lastRateLimit): void {
  lastRateLimit = info
}

export function startScheduler(): void {
  if (schedulerTimer) return
  void runDueTasks()
  schedulerTimer = setInterval(() => void runDueTasks(), 60_000)
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}

async function runDueTasks(): Promise<void> {
  if (!isModuleEnabled('automation')) return
  const token = getActiveToken()
  if (!token) return

  const tasks = getDatabase()
    .prepare('SELECT * FROM scheduled_tasks WHERE is_enabled = 1')
    .all() as Array<{
    id: number
    name: string
    type: string
    config_json: string
    interval_minutes: number
    last_run_at: string | null
  }>

  const now = Date.now()

  for (const task of tasks) {
    const lastRun = task.last_run_at ? new Date(task.last_run_at).getTime() : 0
    const due = now - lastRun >= task.interval_minutes * 60_000
    if (!due) continue

    try {
      const config = JSON.parse(task.config_json) as Record<string, unknown>
      await executeTask(token, task.type, config)
      getDatabase()
        .prepare("UPDATE scheduled_tasks SET last_run_at = datetime('now'), last_error = NULL WHERE id = ?")
        .run(task.id)
      getDatabase()
        .prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)')
        .run('automation', task.type, task.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      getDatabase()
        .prepare("UPDATE scheduled_tasks SET last_error = ? WHERE id = ?")
        .run(msg, task.id)
      getDatabase()
        .prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)')
        .run('automation', 'task_failed', `${task.name}: ${msg}`)
      notifyAll('task_failed', 'Task failed', `${task.name}: ${msg}`, {
        module: 'automation',
        action: 'task_failed',
        params: { name: task.name, error: msg }
      })
    }
  }
}

async function executeSmartReprice(token: string, config: SmartRepriceConfig): Promise<void> {
  const days = Number(config.days_without_sale ?? 7)
  const stale = getStaleListings(days)
  const db = getDatabase()
  const update = db.prepare("UPDATE listing_tracking SET last_repriced_at = datetime('now') WHERE item_id = ?")

  for (const row of stale) {
    const currentPrice = row.price ?? 0
    if (!currentPrice) continue
    const category = 'steam'
    const newPrice = await computeSmartPrice(token, row.item_id, currentPrice, category, config)
    if (newPrice === null) continue
    await lztRequest(token, '/items/bulk-action', {
      method: 'POST',
      body: {
        action: 'edit-price',
        item_ids: [row.item_id],
        price: newPrice,
        currency: 'rub'
      }
    })
    update.run(row.item_id)
  }
}

async function executeCompetitorUndercut(
  token: string,
  config: Record<string, unknown>
): Promise<void> {
  const undercutRub = Number(config.undercut_rub ?? 1)
  const minMargin = Number(config.min_margin_percent ?? 10) / 100
  const respectBuyPrice = config.respect_buy_price !== false
  const minScore = Number(config.min_match_score ?? 0.52)
  const competitorIds = (config.competitor_user_ids as string[] | undefined) ?? []

  await syncAllCompetitors(token, { minMatchScore: minScore })

  const matches = getListingMatches().filter((m) => {
    if (m.match_score < minScore) return false
    if (competitorIds.length > 0 && !competitorIds.includes(m.competitor_user_id)) return false
    return (m.our_price ?? 0) > 0 && (m.competitor_price ?? 0) > 0
  })

  const db = getDatabase()
  const update = db.prepare("UPDATE listing_tracking SET last_repriced_at = datetime('now'), price = ? WHERE item_id = ?")

  for (const match of matches) {
    const currentPrice = match.our_price ?? 0
    const competitorPrice = match.competitor_price ?? 0
    if (!currentPrice || !competitorPrice) continue

    let target = Math.max(1, Math.round(competitorPrice - undercutRub))
    if (target >= currentPrice) continue

    if (respectBuyPrice) {
      const buyFloor = getBuyFloor(match.our_item_id)
      if (buyFloor !== null) {
        const minPrice = Math.round(buyFloor * (1 + minMargin))
        if (target < minPrice) target = minPrice
      }
    }

    if (target >= currentPrice) continue

    await lztRequest(token, '/items/bulk-action', {
      method: 'POST',
      body: {
        action: 'edit-price',
        item_ids: [match.our_item_id],
        price: target,
        currency: 'rub'
      }
    })
    update.run(target, match.our_item_id)
  }
}

async function executeTask(
  token: string,
  type: string,
  config: Record<string, unknown>
): Promise<void> {
  const listingTypes = ['auto_reprice_stale', 'smart_reprice_stale', 'competitor_undercut_reprice']
  if (listingTypes.includes(type) && !isBridgeActive(['upload', 'automation'])) return

  const competitorTypes = ['sync_competitor_listings', 'competitor_undercut_reprice']
  if (competitorTypes.includes(type) && !isBridgeActive(['buyer', 'analytics', 'automation'])) return

  const itemIds = (config.item_ids as number[]) ?? []
  const noItemIdsRequired =
    type === 'auto_bump_single' ||
    type === 'auto_reprice_stale' ||
    type === 'smart_reprice_stale' ||
    type === 'sync_competitor_listings' ||
    type === 'competitor_undercut_reprice'
  if (itemIds.length === 0 && !noItemIdsRequired) return

  switch (type) {
    case 'auto_bump_single': {
      const itemId = Number(config.item_id)
      const hour = Number(config.hour ?? 6)
      await lztRequest(token, `/${itemId}/auto-bump`, { method: 'POST', body: { hour } })
      break
    }
    case 'bulk_bump':
      await lztRequest(token, '/items/bulk-action', {
        method: 'POST',
        body: { action: 'bump', item_ids: itemIds }
      })
      break
    case 'bulk_close':
      await lztRequest(token, '/items/bulk-action', {
        method: 'POST',
        body: { action: 'close', item_ids: itemIds }
      })
      break
    case 'bulk_open':
      await lztRequest(token, '/items/bulk-action', {
        method: 'POST',
        body: { action: 'open', item_ids: itemIds }
      })
      break
    case 'auto_reprice':
      await lztRequest(token, '/items/bulk-action', {
        method: 'POST',
        body: {
          action: 'edit-price',
          item_ids: itemIds,
          change_price_in_percents: true,
          percents_price: Number(config.drop_percent ?? 5)
        }
      })
      break
    case 'auto_reprice_stale': {
      const days = Number(config.days_without_sale ?? 7)
      const drop = Number(config.drop_percent ?? 5)
      const db = getDatabase()
      const stale = db
        .prepare(
          `SELECT item_id FROM listing_tracking
           WHERE julianday('now') - julianday(listed_at) >= ?
           AND (last_repriced_at IS NULL OR julianday('now') - julianday(last_repriced_at) >= 1)`
        )
        .all(days) as Array<{ item_id: number }>
      const staleIds = stale.map((r) => r.item_id)
      if (staleIds.length === 0) break
      await lztRequest(token, '/items/bulk-action', {
        method: 'POST',
        body: {
          action: 'edit-price',
          item_ids: staleIds,
          change_price_in_percents: true,
          percents_price: drop
        }
      })
      const update = db.prepare("UPDATE listing_tracking SET last_repriced_at = datetime('now') WHERE item_id = ?")
      for (const id of staleIds) update.run(id)
      break
    }
    case 'smart_reprice_stale':
      await executeSmartReprice(token, config as SmartRepriceConfig)
      break
    case 'sync_competitor_listings':
      await syncAllCompetitors(token, {
        minMatchScore: Number(config.min_match_score ?? 0.52)
      })
      break
    case 'competitor_undercut_reprice':
      await executeCompetitorUndercut(token, config)
      break
    default:
      break
  }
}
