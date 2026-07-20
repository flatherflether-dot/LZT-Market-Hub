import { powerSaveBlocker } from 'electron'
import { getDatabase, getActiveToken, getSetting } from './database'
import { insertAutoDeal } from './deal-helper'
import { lztRequest } from './lzt-api'
import { evaluateRules, isBlacklisted, type MarketListing } from './rules-engine'
import { notifyAll } from './notify-helper'
import { fireWebhook } from './webhook-helper'
import { trackCompetitorListings } from './competitor-tracker'
import { updateTrayMenu } from './tray-helper'
import { formatMarketText } from './market-text'

let monitorTimer: ReturnType<typeof setInterval> | null = null
let filterIndex = 0
let claimPollCounter = 0
let running = false
let powerBlockerId: number | null = null

let viewedCache: { ids: Set<number>; at: number } = { ids: new Set(), at: 0 }

export function isMonitorRunning(): boolean {
  return running
}

function getMonitorIntervalMs(): number {
  const raw = Number(getSetting('monitor_interval_seconds'))
  if (!raw || Number.isNaN(raw)) return 3500
  return Math.max(2, raw) * 1000
}

import { isModuleEnabled } from './modules-config'

export function startBackgroundMonitor(): void {
  if (!isModuleEnabled('buyer')) return
  if (monitorTimer) return
  running = true
  if (powerBlockerId === null) {
    powerBlockerId = powerSaveBlocker.start('prevent-app-suspension')
  }
  updateTrayMenu()
  void pollMonitor()
  monitorTimer = setInterval(() => void pollMonitor(), getMonitorIntervalMs())
}

export function stopBackgroundMonitor(): void {
  running = false
  if (monitorTimer) {
    clearInterval(monitorTimer)
    monitorTimer = null
  }
  if (powerBlockerId !== null) {
    if (powerSaveBlocker.isStarted(powerBlockerId)) powerSaveBlocker.stop(powerBlockerId)
    powerBlockerId = null
  }
  updateTrayMenu()
}

export function restartBackgroundMonitor(): void {
  const wasRunning = running
  stopBackgroundMonitor()
  if (wasRunning) startBackgroundMonitor()
}

function getAutobuyLimits(): {
  enabled: boolean
  maxPrice: number
  maxDaily: number
  minRoi: number
  useApiPrice: boolean
  minSteamInv: number
} {
  return {
    enabled: getSetting('autobuy_enabled') === '1',
    maxPrice: Number(getSetting('autobuy_max_price') || 0),
    maxDaily: Number(getSetting('autobuy_max_daily') || 10),
    minRoi: Number(getSetting('autobuy_min_roi') || 0),
    useApiPrice: getSetting('autobuy_use_api_price') !== '0',
    minSteamInv: Number(getSetting('autobuy_min_steam_inv') || 0)
  }
}

function getDailyAutobuyCount(): number {
  return (
    getDatabase()
      .prepare("SELECT COUNT(*) as c FROM autobuy_log WHERE date(created_at) = date('now')")
      .get() as { c: number }
  ).c
}

async function getViewedItemIds(token: string): Promise<Set<number>> {
  if (getSetting('monitor_skip_viewed') === '0') return new Set()
  if (Date.now() - viewedCache.at < 120_000 && viewedCache.ids.size > 0) {
    return viewedCache.ids
  }
  try {
    const data = await lztRequest<{ items?: MarketListing[] }>(token, '/viewed')
    const ids = new Set((data.items ?? []).map((i) => i.item_id))
    viewedCache = { ids, at: Date.now() }
    return ids
  } catch {
    return viewedCache.ids
  }
}

async function passesAutobuyChecks(token: string, item: MarketListing): Promise<boolean> {
  const limits = getAutobuyLimits()
  if (limits.maxPrice > 0 && item.price > limits.maxPrice) return false

  if (limits.useApiPrice) {
    try {
      const data = await lztRequest<{ price?: number; auto_buy_price?: number }>(
        token,
        `/${item.item_id}/auto-buy-price`
      )
      const threshold = data.price ?? data.auto_buy_price
      if (threshold !== undefined && item.price > threshold) return false
    } catch {
      return false
    }
  }

  if (limits.minSteamInv > 0) {
    try {
      const data = await lztRequest<{ value?: number; inventory_value?: number; steam_inventory_value?: number }>(
        token,
        `/${item.item_id}/inventory-value`
      )
      const inv = data.value ?? data.inventory_value ?? data.steam_inventory_value ?? 0
      if (inv < limits.minSteamInv) return false
    } catch {
      return false
    }
  }

  return true
}

async function tryAutobuy(token: string, item: MarketListing): Promise<boolean> {
  const limits = getAutobuyLimits()
  if (!limits.enabled) return false
  if (getDailyAutobuyCount() >= limits.maxDaily) return false
  if (!(await passesAutobuyChecks(token, item))) return false

  try {
    await lztRequest(token, `/${item.item_id}/fast-buy`, {
      method: 'POST',
      params: { price: item.price }
    })
    getDatabase()
      .prepare('INSERT INTO autobuy_log (item_id, price) VALUES (?, ?)')
      .run(item.item_id, item.price)
    insertAutoDeal({
      item_id: item.item_id,
      action: 'buy',
      buy_price: item.price,
      notes: item.title,
      source: 'autobuy'
    })
    notifyAll('autobuy', 'Auto-buy', `${item.title} — ${item.price} ₽`, {
      url: `https://lzt.market/${item.item_id}`
    })
    void fireWebhook('autobuy', {
      item_id: item.item_id,
      title: item.title,
      price: item.price,
      url: `https://lzt.market/${item.item_id}`
    })
    void fireWebhook('deal', {
      action: 'buy',
      source: 'autobuy',
      item_id: item.item_id,
      buy_price: item.price,
      title: item.title
    })
    getDatabase()
      .prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)')
      .run('buyer', 'autobuy', String(item.item_id))
    return true
  } catch {
    return false
  }
}

async function pollClaims(token: string): Promise<void> {
  try {
    const data = await lztRequest<{ claims?: Array<{ claim_id: number; item_id?: number; post_body?: string }> }>(
      token,
      '/claims'
    )
    const claims = data.claims ?? []
    const knownRaw = getSetting('known_claim_ids')
    const known = new Set(JSON.parse(knownRaw || '[]') as number[])
    const fresh = claims.filter((c) => !known.has(c.claim_id))

    for (const claim of fresh) {
      notifyAll('claim', 'New claim', `Claim #${claim.claim_id}${claim.item_id ? ` on #${claim.item_id}` : ''}`, {
        url: claim.item_id ? `https://lzt.market/${claim.item_id}` : undefined
      })
      void fireWebhook('claim', {
        claim_id: claim.claim_id,
        item_id: claim.item_id,
        post_body: claim.post_body
      })
    }

    getDatabase()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
      .run('known_claim_ids', JSON.stringify(claims.map((c) => c.claim_id)), JSON.stringify(claims.map((c) => c.claim_id)))
  } catch {

  }
}

async function handleNewListing(
  token: string,
  item: MarketListing,
  filterCategory: string,
  filterName: string
): Promise<void> {
  if (isBlacklisted(item)) return

  const rules = evaluateRules(item, filterCategory)
  const body = `${item.title} — ${item.price} ₽`
  const url = `https://lzt.market/${item.item_id}`

  if (rules.length === 0) {
    notifyAll('new_listing', 'New listing', body, { subtitle: filterName, url })
    void fireWebhook('new_listing', {
      item_id: item.item_id,
      title: item.title,
      price: item.price,
      category: filterCategory,
      filter: filterName,
      url
    })
    return
  }

  for (const { rule, actions } of rules) {
    if (actions.desktop_notify !== false) {
      notifyAll('new_listing', `Rule: ${rule.name}`, body, { subtitle: filterName, url })
    }
    if (actions.watchlist) {
      const title = formatMarketText(item.title) || null
      getDatabase()
        .prepare(
          'INSERT INTO watchlist (item_id, title, price) VALUES (?,?,?) ON CONFLICT(item_id) DO UPDATE SET title=excluded.title, price=excluded.price'
        )
        .run(item.item_id, title, item.price)
    }
    if (actions.autobuy) {
      await tryAutobuy(token, item)
    }
    getDatabase()
      .prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)')
      .run('buyer', 'rule_matched', `${rule.name} → ${item.item_id}`)
  }
}

async function pollMonitor(): Promise<void> {
  const token = getActiveToken()
  if (!token) return

  claimPollCounter++
  if (claimPollCounter % 10 === 0) {
    void pollClaims(token)
  }

  const filters = getDatabase()
    .prepare('SELECT * FROM watch_filters WHERE is_enabled = 1 ORDER BY id')
    .all() as Array<{ id: number; category: string; params_json: string; name: string }>

  if (filters.length === 0) return

  const filter = filters[filterIndex % filters.length]
  filterIndex++

  try {
    const params = JSON.parse(filter.params_json) as Record<string, number | string | boolean>
    const query = new URLSearchParams()
    query.set('order_by', 'pdate_to_down')
    query.set(
      'fields_include',
      'item_id,title,price,item_state,category_id,published_date,category_name,seller'
    )
    query.set('locale', getSetting('locale') === 'ru' ? 'ru' : 'en')
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== '' && val !== false) {
        query.set(key, String(val))
      }
    }

    const [data, viewedIds] = await Promise.all([
      lztRequest<{ items: MarketListing[] }>(token, `/${filter.category}?${query.toString()}`),
      getViewedItemIds(token)
    ])

    const seenStmt = getDatabase().prepare(
      'INSERT OR IGNORE INTO seen_listings (item_id) VALUES (?)'
    )
    const wasSeenStmt = getDatabase().prepare('SELECT 1 FROM seen_listings WHERE item_id = ?')

    trackCompetitorListings(filter.category, data.items ?? [])

    for (const item of data.items ?? []) {
      if (viewedIds.has(item.item_id)) {
        seenStmt.run(item.item_id)
        continue
      }

      const seen = wasSeenStmt.get(item.item_id)
      seenStmt.run(item.item_id)
      if (seen) continue

      await handleNewListing(token, item, filter.category, filter.name)

      const watchRow = getDatabase()
        .prepare('SELECT * FROM watchlist WHERE item_id = ?')
        .get(item.item_id) as { target_price: number | null; title: string | null } | undefined
      if (watchRow?.target_price && item.price <= watchRow.target_price) {
        notifyAll(
          'price_alert',
          'Price alert',
          `${watchRow.title ?? item.title} dropped to ${item.price} ₽`,
          { url: `https://lzt.market/${item.item_id}` }
        )
      }
    }
  } catch {

  }
}

export function notifyExternal(title: string, body: string): void {
  notifyAll('generic', title, body)
}
