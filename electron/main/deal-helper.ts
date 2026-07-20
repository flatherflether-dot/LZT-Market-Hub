import type Database from 'better-sqlite3'
import { getDatabase, getSetting } from './database'
import { isBridgeActive, isModuleEnabled } from './modules-config'

const AUTO_DEAL_SETTING = 'reseller_auto_deal_enabled'
const FEE_SETTING = 'reseller_default_fee_percent'

export function isAutoDealEnabled(): boolean {
  if (!isModuleEnabled('reseller')) return false
  return getSetting(AUTO_DEAL_SETTING) !== '0'
}

export function getDefaultFeePercent(): number {
  const n = Number(getSetting(FEE_SETTING))
  return Number.isFinite(n) && n >= 0 ? n : 5
}

export function calcDealMargin(buy: number, sell: number, feePercent?: number): number {
  const fee = feePercent ?? getDefaultFeePercent()
  const netSell = sell * (1 - fee / 100)
  return netSell - buy
}

function hasRecentDuplicate(
  db: Database.Database,
  deal: {
    item_id?: number
    action: string
    source?: string
    buy_price?: number
    sell_price?: number
  }
): boolean {
  if (!deal.item_id) return false
  const row = db
    .prepare(
      `SELECT 1 FROM deals
       WHERE item_id = ? AND action = ?
         AND (? IS NULL OR source = ?)
         AND datetime(created_at) > datetime('now', '-5 minutes')
       LIMIT 1`
    )
    .get(deal.item_id, deal.action, deal.source ?? null, deal.source ?? null)
  return Boolean(row)
}

export interface MainAutoDealInput {
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
  feePercent?: number
  requireBridge?: string[]
}

export function insertAutoDeal(deal: MainAutoDealInput): number | null {
  if (!isAutoDealEnabled()) return null
  if (deal.requireBridge?.length && !isBridgeActive(deal.requireBridge)) return null

  const db = getDatabase()
  if (hasRecentDuplicate(db, deal)) return null

  let margin = deal.margin
  const buy = deal.buy_price ?? 0
  const sell = deal.sell_price ?? 0
  if (margin == null && buy > 0 && sell > 0) {
    margin = calcDealMargin(buy, sell, deal.feePercent)
  }

  const result = db
    .prepare(
      'INSERT INTO deals (item_id, category, action, buy_price, sell_price, margin, notes, transfer_to, source, parent_deal_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
    )
    .run(
      deal.item_id ?? null,
      deal.category ?? null,
      deal.action,
      deal.buy_price ?? null,
      deal.sell_price ?? null,
      margin ?? null,
      deal.notes ?? null,
      deal.transfer_to ?? null,
      deal.source ?? 'flip',
      deal.parent_deal_id ?? null
    )

  db.prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)').run(
    'reseller',
    'deal_added',
    String(deal.item_id ?? deal.source ?? deal.action)
  )

  return Number(result.lastInsertRowid)
}
