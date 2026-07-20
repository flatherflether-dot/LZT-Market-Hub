import { getDatabase } from './database'
import { lztRequest } from './lzt-api'

interface ListingRow {
  item_id: number
  price: number | null
  category?: string
}

export interface SmartRepriceConfig {
  days_without_sale?: number
  min_margin_percent?: number
  respect_buy_price?: boolean
  use_category_median?: boolean
  drop_percent_fallback?: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function getBuyFloor(itemId: number): number | null {
  const row = getDatabase()
    .prepare(
      `SELECT buy_price FROM deals
       WHERE item_id = ? AND buy_price IS NOT NULL
       ORDER BY id DESC LIMIT 1`
    )
    .get(itemId) as { buy_price: number } | undefined
  return row?.buy_price ?? null
}

export async function computeSmartPrice(
  token: string,
  itemId: number,
  currentPrice: number,
  category: string,
  config: SmartRepriceConfig
): Promise<number | null> {
  const minMargin = Number(config.min_margin_percent ?? 10) / 100
  const fallbackDrop = Number(config.drop_percent_fallback ?? 5) / 100
  let target = currentPrice * (1 - fallbackDrop)

  if (config.use_category_median !== false) {
    try {
      const data = await lztRequest<{ items?: Array<{ price: number }> }>(
        token,
        `/${category}?order_by=price_to_up&pmin=1`
      )
      const prices = (data.items ?? []).slice(0, 30).map((i) => i.price).filter(Boolean)
      const catMedian = median(prices)
      if (catMedian > 0) target = Math.min(target, catMedian)
    } catch {

    }
  }

  if (config.respect_buy_price !== false) {
    const buyFloor = getBuyFloor(itemId)
    if (buyFloor !== null) {
      const minPrice = buyFloor * (1 + minMargin)
      target = Math.max(target, minPrice)
    }
  }

  if (target >= currentPrice) return null
  return Math.max(1, Math.round(target))
}

export function getStaleListings(days: number): ListingRow[] {
  return getDatabase()
    .prepare(
      `SELECT lt.item_id, lt.price FROM listing_tracking lt
       WHERE julianday('now') - julianday(lt.listed_at) >= ?
       AND (lt.last_repriced_at IS NULL OR julianday('now') - julianday(lt.last_repriced_at) >= 1)`
    )
    .all(days) as ListingRow[]
}
