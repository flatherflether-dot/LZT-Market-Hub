import type { MarketItem, MarketItemDetail, MarketItemDetailResponse } from './constants'
import { formatMarketText, unwrapMarketItem } from './market-utils'

const KNOWN_ITEM_META_KEYS = new Set([
  'item',
  'item_id',
  'item_state',
  'category_id',
  'category',
  'published_date',
  'publishedDate',
  'title',
  'title_en',
  'description',
  'description_en',
  'descriptionPlain',
  'descriptionEnPlain',
  'descriptionHtml',
  'descriptionEnHtml',
  'price',
  'rub_price',
  'item_price',
  'price_currency',
  'priceWithSellerFee',
  'priceWithSellerFeeLabel',
  'update_stat_date',
  'refreshed_date',
  'edit_date',
  'pending_deletion_date',
  'view_count',
  'is_sticky',
  'item_origin',
  'itemOriginPhrase',
  'resale_item_origin',
  'extended_guarantee',
  'nsb',
  'allow_ask_discount',
  'email_type',
  'email_provider',
  'item_domain',
  'auto_bump_period',
  'guarantee_duration',
  'guarantee',
  'discount',
  'feedback_data',
  'max_discount_percent',
  'note',
  'note_text',
  'tags',
  'tag_ids',
  'public_tag',
  'buyer',
  'seller',
  'discount_request',
  'discountRequest',
  'account_avatar',
  'game_title',
  'inventory_value',
  'steam_inventory_value',
  'inventory',
  'accountLink',
  'accountLinks',
  'imagePreviewLinks',
  'emailLoginUrl',
  'copyFormatData',
  'sameItemsIds',
  'sameItemsCount',
  'isPersonalAccount',
  'canViewLoginData',
  'canViewTempEmail',
  'canUpdateItemStats',
  'canReportItem',
  'canViewItemViews',
  'canManagePublicTag',
  'canViewEmailLoginData',
  'showGetEmailCodeButton',
  'canOpenItem',
  'canCloseItem',
  'canEditItem',
  'canDeleteItem',
  'canStickItem',
  'canUnstickItem',
  'canBumpItem',
  'canNotBumpItemReason',
  'canAutoBump',
  'canBuyItem',
  'canValidateAccount',
  'canResellItem',
  'canViewAccountLink',
  'canChangePassword',
  'canChangeEmailPassword',
  'uniqueKeyExists',
  'sold_items_category_count',
  'restore_items_category_count',
  'system_info'
])

export interface ItemDisplayField {
  key: string
  label: string
  value: string
}

function toNumber(value: unknown): number | undefined {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : undefined
}

function normalizeItemDetail(raw: MarketItemDetail): MarketItemDetail {
  const price = toNumber(raw.price ?? raw.rub_price ?? raw.item_price)
  return {
    ...raw,
    title: formatMarketText(raw.title) || String(raw.item_id),
    title_en: formatMarketText(raw.title_en) || undefined,
    category: formatMarketText(raw.category) || undefined,
    price: price != null && price > 0 ? price : raw.price,
    note: raw.note ?? raw.note_text
  }
}

export function parseItemDetailResponse(data: unknown): MarketItemDetailResponse | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const itemRaw = unwrapMarketItem(record) as MarketItemDetail
  if (typeof itemRaw.item_id !== 'number') return null

  const item = normalizeItemDetail(itemRaw)
  return {
    item,
    canStickItem: boolOr(record.canStickItem, item.canStickItem),
    canUnstickItem: boolOr(record.canUnstickItem, item.canUnstickItem),
    canOpenItem: boolOr(record.canOpenItem, item.canOpenItem),
    canCloseItem: boolOr(record.canCloseItem, item.canCloseItem),
    canEditItem: boolOr(record.canEditItem, item.canEditItem),
    canDeleteItem: boolOr(record.canDeleteItem, item.canDeleteItem),
    canBumpItem: boolOr(record.canBumpItem, item.canBumpItem),
    faveCount: toNumber(record.faveCount),
    itemLink: typeof record.itemLink === 'string' ? record.itemLink : undefined,
    sameItemsIds: Array.isArray(record.sameItemsIds)
      ? record.sameItemsIds.filter((id): id is number => typeof id === 'number')
      : item.sameItemsIds,
    sameItemsCount: toNumber(record.sameItemsCount ?? item.sameItemsCount)
  }
}

function boolOr(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (value === 1) return true
    if (value === 0) return false
  }
  return undefined
}

export function formatItemTimestamp(ts?: number | null): string {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return '—'
  const ms = ts > 1_000_000_000_000 ? ts : ts * 1000
  return new Date(ms).toLocaleString()
}

export function formatItemFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatItemFieldValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('ru-RU')
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '—'
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value
      .map((entry) => {
        if (entry == null) return ''
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
          return String(entry)
        }
        if (typeof entry === 'object') {
          const obj = entry as Record<string, unknown>
          return formatMarketText(obj.title ?? obj.name ?? obj.text ?? obj.link)
        }
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const text = formatMarketText(obj.title ?? obj.name ?? obj.text ?? obj.link ?? obj.durationPhrase)
    if (text) return text
    try {
      const json = JSON.stringify(value)
      return json.length > 240 ? `${json.slice(0, 240)}…` : json
    } catch {
      return '—'
    }
  }
  return String(value)
}

export function extractCategoryFields(item: MarketItemDetail): ItemDisplayField[] {
  const fields: ItemDisplayField[] = []
  for (const [key, value] of Object.entries(item)) {
    if (KNOWN_ITEM_META_KEYS.has(key)) continue
    if (key.startsWith('can') || key.startsWith('show')) continue
    if (value == null || value === '' || value === false) continue
    if (typeof value === 'object' && !Array.isArray(value)) continue
    fields.push({
      key,
      label: formatItemFieldLabel(key),
      value: formatItemFieldValue(value)
    })
  }
  return fields.sort((a, b) => a.label.localeCompare(b.label))
}

export function resolveItemPrice(item?: MarketItemDetail, fallback?: number): number | undefined {
  const p = toNumber(item?.price ?? item?.rub_price ?? fallback)
  return p != null && p > 0 ? p : undefined
}

export function mergeItemDetail(live?: MarketItem, detail?: MarketItemDetail): MarketItemDetail | undefined {
  if (!live && !detail) return undefined
  return {
    ...(live as MarketItemDetail),
    ...detail,
    tags: detail?.tags ?? live?.tags,
    note: detail?.note ?? live?.note
  }
}
