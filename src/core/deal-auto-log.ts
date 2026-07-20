import { calcDealMargin } from './deal-margin'
import type { DealInput } from '@renderer/types/database'

const AUTO_DEAL_SETTING = 'reseller_auto_deal_enabled'
const FEE_SETTING = 'reseller_default_fee_percent'

async function isResellerModuleEnabled(): Promise<boolean> {
  const raw = await window.api.db.getSetting('modules_enabled')
  if (!raw) return true
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed.reseller !== false
  } catch {
    return true
  }
}

export async function isAutoDealEnabled(): Promise<boolean> {
  if (!(await isResellerModuleEnabled())) return false
  const flag = await window.api.db.getSetting(AUTO_DEAL_SETTING)
  return flag !== '0'
}

export async function getDefaultFeePercent(): Promise<number> {
  const v = await window.api.db.getSetting(FEE_SETTING)
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 5
}

export async function setDefaultFeePercent(fee: number): Promise<void> {
  await window.api.db.setSetting(FEE_SETTING, String(fee))
}

export async function setAutoDealEnabled(enabled: boolean): Promise<void> {
  await window.api.db.setSetting(AUTO_DEAL_SETTING, enabled ? '1' : '0')
}

export async function resolveParentDeal(itemId: number): Promise<{
  buy_price?: number
  parent_deal_id?: number
  category?: string
}> {
  const deals = await window.api.db.getDeals()
  const buyDeal = deals.find(
    (d) => d.item_id === itemId && (d.action === 'buy' || d.buy_price != null)
  )
  if (buyDeal) {
    return {
      buy_price: buyDeal.buy_price ?? undefined,
      parent_deal_id: buyDeal.id,
      category: buyDeal.category ?? undefined
    }
  }
  const any = deals.find((d) => d.item_id === itemId)
  if (!any) return {}
  return {
    buy_price: any.buy_price ?? undefined,
    parent_deal_id: any.id,
    category: any.category ?? undefined
  }
}

async function hasRecentDuplicate(deal: DealInput): Promise<boolean> {
  if (!deal.item_id) return false
  const deals = await window.api.db.getDeals()
  const cutoff = Date.now() - 5 * 60 * 1000
  return deals.some((d) => {
    if (d.item_id !== deal.item_id || d.action !== deal.action) return false
    if (deal.source && d.source !== deal.source) return false
    const ts = new Date(d.created_at).getTime()
    if (Number.isNaN(ts) || ts < cutoff) return false
    if (deal.buy_price != null && d.buy_price !== deal.buy_price) return false
    if (deal.sell_price != null && d.sell_price !== deal.sell_price) return false
    return true
  })
}

export interface AutoDealInput extends DealInput {
  feePercent?: number
  force?: boolean
}

export async function autoLogDeal(input: AutoDealInput): Promise<number | null> {
  if (!input.force && !(await isAutoDealEnabled())) return null
  if (await hasRecentDuplicate(input)) return null

  const fee = input.feePercent ?? (await getDefaultFeePercent())
  let margin = input.margin
  const buy = input.buy_price ?? 0
  const sell = input.sell_price ?? 0
  if (margin == null && buy > 0 && sell > 0) {
    margin = calcDealMargin(buy, sell, fee).margin
  }

  const id = await window.api.db.addDeal({
    ...input,
    margin: margin ?? undefined
  })
  await window.api.db.logActivity('reseller', 'deal_added', String(input.item_id ?? input.source ?? input.action))
  return id
}
