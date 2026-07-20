import { getDatabase, getSetting } from './database'
import { lztRequest } from './lzt-api'
import { formatMarketText } from './market-text'
import { findListingMatches, type MatchableListing } from './lot-matcher'
import { trackCompetitorListings, type CompetitorListing } from './competitor-tracker'
import { isBridgeActive } from './modules-config'

export interface CompetitorWatchEntry {
  id: number
  user_id: string
  label: string | null
  username: string | null
  is_enabled: number
  last_sync_at: string | null
  listing_count: number
  created_at: string
}

export interface StoredCompetitorListing {
  user_id: string
  category: string
  item_id: number
  title: string | null
  price: number
  captured_at: string
}

export interface StoredListingMatch {
  our_item_id: number
  competitor_user_id: string
  competitor_item_id: number
  match_score: number
  our_title: string | null
  our_price: number | null
  our_category: string | null
  competitor_title: string | null
  competitor_price: number | null
  competitor_category: string | null
  updated_at: string
}

function parseUserItems(data: unknown): CompetitorListing[] {
  const items: CompetitorListing[] = []
  const payload = data as { items?: unknown[] | Record<string, unknown> }

  const rawList: unknown[] = Array.isArray(payload.items)
    ? payload.items
    : payload.items && typeof payload.items === 'object'
      ? Object.values(payload.items)
      : []

  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue
    const obj = entry as Record<string, unknown>
    const nested =
      obj.item && typeof obj.item === 'object' ? (obj.item as Record<string, unknown>) : obj
    const itemId = Number(nested.item_id ?? obj.item_id)
    if (!itemId) continue

    const sellerRaw = nested.seller ?? obj.seller
    const seller =
      sellerRaw && typeof sellerRaw === 'object'
        ? (sellerRaw as { user_id?: number; username?: string })
        : undefined

    items.push({
      item_id: itemId,
      title: formatMarketText(nested.title ?? obj.title) || `#${itemId}`,
      price: Number(nested.price ?? obj.price ?? 0),
      category: formatMarketText(nested.category ?? nested.category_name ?? obj.category) || 'other',
      seller
    })
  }

  return items
}

function migrateLegacyCompetitorSetting(): void {
  const legacy = getSetting('competitor_user_id')?.trim()
  if (!legacy) return

  const db = getDatabase()
  const exists = db
    .prepare('SELECT id FROM competitor_watchlist WHERE user_id = ?')
    .get(legacy) as { id: number } | undefined
  if (!exists) {
    db.prepare(
      'INSERT INTO competitor_watchlist (user_id, label, is_enabled) VALUES (?, ?, 1)'
    ).run(legacy, `Конкурент ${legacy}`)
  }
}

export function initCompetitorWatchlist(): void {
  migrateLegacyCompetitorSetting()
}

export function getCompetitorWatchlist(): CompetitorWatchEntry[] {
  return getDatabase()
    .prepare('SELECT * FROM competitor_watchlist ORDER BY created_at DESC')
    .all() as CompetitorWatchEntry[]
}

function getEnabledCompetitorIdsLocal(): string[] {
  return (
    getDatabase()
      .prepare('SELECT user_id FROM competitor_watchlist WHERE is_enabled = 1')
      .all() as Array<{ user_id: string }>
  ).map((r) => r.user_id)
}

export function addCompetitorWatch(userId: string, label?: string): number {
  const uid = userId.trim()
  if (!uid) throw new Error('user_id required')

  const db = getDatabase()
  const existing = db
    .prepare('SELECT id FROM competitor_watchlist WHERE user_id = ?')
    .get(uid) as { id: number } | undefined
  if (existing) return existing.id

  return Number(
    db
      .prepare(
        'INSERT INTO competitor_watchlist (user_id, label, is_enabled) VALUES (?, ?, 1)'
      )
      .run(uid, label?.trim() || null).lastInsertRowid
  )
}

export function removeCompetitorWatch(id: number): void {
  const db = getDatabase()
  const row = db.prepare('SELECT user_id FROM competitor_watchlist WHERE id = ?').get(id) as
    | { user_id: string }
    | undefined
  if (!row) return

  db.prepare('DELETE FROM competitor_watchlist WHERE id = ?').run(id)
  db.prepare('DELETE FROM listing_matches WHERE competitor_user_id = ?').run(row.user_id)
}

export function setCompetitorWatchEnabled(id: number, enabled: boolean): void {
  getDatabase()
    .prepare('UPDATE competitor_watchlist SET is_enabled = ? WHERE id = ?')
    .run(enabled ? 1 : 0, id)
}

export function getOurListingsForMatch(): MatchableListing[] {
  const db = getDatabase()
  const fromTracking = db
    .prepare(
      `SELECT item_id, COALESCE(title, '') as title, COALESCE(price, 0) as price,
              COALESCE(category, 'other') as category
       FROM listing_tracking`
    )
    .all() as MatchableListing[]

  const fromUpload = db
    .prepare(
      `SELECT item_id,
              COALESCE(login, '') as title,
              COALESCE(current_price, initial_price, 0) as price,
              COALESCE(category, 'other') as category
       FROM upload_history
       WHERE item_id IS NOT NULL AND status != 'error'`
    )
    .all() as MatchableListing[]

  const map = new Map<number, MatchableListing>()
  for (const row of fromUpload) {
    if (row.item_id) map.set(row.item_id, row)
  }
  for (const row of fromTracking) {
    const prev = map.get(row.item_id)
    map.set(row.item_id, {
      item_id: row.item_id,
      title: row.title || prev?.title || '',
      price: row.price || prev?.price || 0,
      category: row.category !== 'other' ? row.category : prev?.category || 'other'
    })
  }
  return [...map.values()].filter((r) => r.price > 0)
}

function upsertCompetitorPrices(userId: string, listings: CompetitorListing[]): void {
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

  for (const item of listings) {
    upsert.run(userId, item.category ?? 'other', item.item_id, item.title, item.price)
  }
}

export function recomputeMatchesForCompetitor(
  competitorUserId: string,
  minScore = 0.52
): number {
  const db = getDatabase()
  const competitorListings = db
    .prepare(
      `SELECT item_id, COALESCE(title, '') as title, price,
              COALESCE(category, 'other') as category
       FROM competitor_prices WHERE user_id = ?`
    )
    .all(competitorUserId) as MatchableListing[]

  const ourListings = getOurListingsForMatch()
  const matches = findListingMatches(ourListings, competitorListings, minScore)

  db.prepare('DELETE FROM listing_matches WHERE competitor_user_id = ?').run(competitorUserId)

  const insert = db.prepare(`
    INSERT INTO listing_matches
      (our_item_id, competitor_user_id, competitor_item_id, match_score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `)

  for (const m of matches) {
    insert.run(m.our_item_id, competitorUserId, m.competitor_item_id, m.match_score)
  }

  return matches.length
}

export async function syncCompetitorListings(
  token: string,
  userId: string,
  options: { recomputeMatches?: boolean; minMatchScore?: number } = {}
): Promise<{ count: number; matches: number }> {
  if (!isBridgeActive(['buyer', 'analytics'])) {
    return { count: 0, matches: 0 }
  }

  const data = await lztRequest<unknown>(token, `/user/${userId}/items`, {
    params: { page: 1 }
  })
  const listings = parseUserItems(data)

  upsertCompetitorPrices(userId, listings)

  for (const cat of [...new Set(listings.map((l) => l.category ?? 'other'))]) {
    trackCompetitorListings(
      cat,
      listings.filter((l) => (l.category ?? 'other') === cat)
    )
  }

  const db = getDatabase()
  db.prepare(
    `UPDATE competitor_watchlist
     SET last_sync_at = datetime('now'), listing_count = ?
     WHERE user_id = ?`
  ).run(listings.length, userId)

  const username = listings[0]?.seller?.username
  if (username) {
    db.prepare('UPDATE competitor_watchlist SET username = ? WHERE user_id = ?').run(
      username,
      userId
    )
  }

  let matches = 0
  if (options.recomputeMatches !== false) {
    matches = recomputeMatchesForCompetitor(userId, options.minMatchScore ?? 0.52)
  }

  return { count: listings.length, matches }
}

export async function syncAllCompetitors(
  token: string,
  options: { minMatchScore?: number } = {}
): Promise<{ synced: number; totalListings: number; totalMatches: number }> {
  const ids = getEnabledCompetitorIdsLocal()
  let synced = 0
  let totalListings = 0
  let totalMatches = 0

  for (const userId of ids) {
    try {
      const result = await syncCompetitorListings(token, userId, {
        recomputeMatches: true,
        minMatchScore: options.minMatchScore
      })
      synced++
      totalListings += result.count
      totalMatches += result.matches
    } catch {

    }
  }

  return { synced, totalListings, totalMatches }
}

export function getCompetitorListingsFromDb(userId: string): StoredCompetitorListing[] {
  return getDatabase()
    .prepare(
      'SELECT * FROM competitor_prices WHERE user_id = ? ORDER BY price ASC, item_id ASC'
    )
    .all(userId) as StoredCompetitorListing[]
}

export function getListingMatches(competitorUserId?: string): StoredListingMatch[] {
  const db = getDatabase()
  if (competitorUserId) {
    return db
      .prepare(
        `SELECT m.*,
                lt.title as our_title, lt.price as our_price, lt.category as our_category,
                cp.title as competitor_title, cp.price as competitor_price, cp.category as competitor_category
         FROM listing_matches m
         LEFT JOIN listing_tracking lt ON lt.item_id = m.our_item_id
         LEFT JOIN competitor_prices cp ON cp.user_id = m.competitor_user_id AND cp.item_id = m.competitor_item_id
         WHERE m.competitor_user_id = ?
         ORDER BY m.match_score DESC`
      )
      .all(competitorUserId) as StoredListingMatch[]
  }

  return db
    .prepare(
      `SELECT m.*,
              lt.title as our_title, lt.price as our_price, lt.category as our_category,
              cp.title as competitor_title, cp.price as competitor_price, cp.category as competitor_category
       FROM listing_matches m
       LEFT JOIN listing_tracking lt ON lt.item_id = m.our_item_id
       LEFT JOIN competitor_prices cp ON cp.user_id = m.competitor_user_id AND cp.item_id = m.competitor_item_id
       ORDER BY m.match_score DESC`
    )
    .all() as StoredListingMatch[]
}

export function enrichListingTracking(
  itemId: number,
  price: number | null,
  title?: string,
  category?: string
): void {
  getDatabase()
    .prepare(
      `INSERT INTO listing_tracking (item_id, price, title, category, listed_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(item_id) DO UPDATE SET
         price = COALESCE(excluded.price, listing_tracking.price),
         title = COALESCE(excluded.title, listing_tracking.title),
         category = COALESCE(excluded.category, listing_tracking.category)`
    )
    .run(itemId, price, title ?? null, category ?? null)
}
