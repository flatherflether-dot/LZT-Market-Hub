import { getDatabase } from './database'
import { notifyAll } from './notify-helper'
import { fireWebhook } from './webhook-helper'
import { isBridgeActive } from './modules-config'

export function getEnabledCompetitorIds(): string[] {
  return (
    getDatabase()
      .prepare('SELECT user_id FROM competitor_watchlist WHERE is_enabled = 1')
      .all() as Array<{ user_id: string }>
  ).map((r) => r.user_id)
}

export interface CompetitorListing {
  item_id: number
  title: string
  price: number
  seller?: { user_id?: number; username?: string }
  category?: string
}

export function trackCompetitorListings(
  category: string,
  items: CompetitorListing[]
): void {
  if (!isBridgeActive(['buyer', 'analytics'])) return
  const watchIds = new Set(getEnabledCompetitorIds())
  if (watchIds.size === 0) return

  const db = getDatabase()
  const upsert = db.prepare(`
    INSERT INTO competitor_prices (user_id, category, item_id, title, price, captured_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, item_id) DO UPDATE SET
      price = excluded.price,
      title = excluded.title,
      category = excluded.category,
      captured_at = excluded.captured_at
  `)
  const getPrev = db.prepare(
    'SELECT price, title FROM competitor_prices WHERE user_id = ? AND item_id = ?'
  )

  for (const item of items) {
    const sellerId = item.seller?.user_id ?? (item as { user_id?: number }).user_id
    if (!sellerId) continue
    const competitorId = String(sellerId)
    if (!watchIds.has(competitorId)) continue

    const prev = getPrev.get(competitorId, item.item_id) as
      | { price: number; title: string }
      | undefined

    upsert.run(competitorId, category, item.item_id, item.title, item.price)

    if (prev && item.price < prev.price) {
      const drop = prev.price - item.price
      const username = item.seller?.username ?? competitorId
      const body = `${username} снизил цену в ${category}: ${prev.price} → ${item.price} ₽ (−${drop})`
      notifyAll('price_alert', 'Competitor undercut', body, {
        subtitle: item.title,
        url: `https://lzt.market/${item.item_id}`
      })
      void fireWebhook('competitor_undercut', {
        user_id: competitorId,
        username,
        category,
        item_id: item.item_id,
        title: item.title,
        old_price: prev.price,
        new_price: item.price,
        drop
      })
      db.prepare(
        'INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)'
      ).run('analytics', 'competitor_undercut', `${item.item_id}: ${prev.price}→${item.price}`)
    }
  }
}
