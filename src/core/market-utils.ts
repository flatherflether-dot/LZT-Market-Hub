import type { MarketItem, ProfileResponse } from './constants'

export interface LztCategoryRef {
  category_id?: number
  category_title?: string
  category_name?: string
  category_url?: string
}

function isCategoryRef(value: unknown): value is LztCategoryRef {
  if (!value || typeof value !== 'object') return false
  const obj = value as LztCategoryRef
  return (
    typeof obj.category_title === 'string' ||
    typeof obj.category_name === 'string' ||
    typeof obj.category_url === 'string' ||
    typeof obj.category_id === 'number'
  )
}

export function formatMarketText(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return formatMarketText(JSON.parse(trimmed) as unknown)
      } catch {
        return value
      }
    }
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.title === 'string') return obj.title
    if (isCategoryRef(obj)) {
      const cat = obj as LztCategoryRef
      return cat.category_title ?? cat.category_name ?? cat.category_url ?? ''
    }
  }
  return ''
}

export function unwrapMarketItem<T extends Record<string, unknown>>(data: T): T {
  const nested = data.item
  if (nested && typeof nested === 'object') return nested as T
  return data
}

export function resolveItemTitle(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const item = unwrapMarketItem(data as Record<string, unknown>)
  return formatMarketText(item.title) || formatMarketText(item.category)
}

export function resolveItemCategory(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const item = unwrapMarketItem(data as Record<string, unknown>)
  return formatMarketText(item.category) || formatMarketText(item.category_name)
}

export function normalizeMarketItem(item: MarketItem): MarketItem {
  return {
    ...item,
    title: formatMarketText(item.title),
    category: formatMarketText(item.category) || undefined
  }
}

export function normalizeMarketItems(data: unknown): MarketItem[] {
  return Object.values(parseBulkItemsMap(data))
}

export function parseBulkItemsMap(data: unknown): Record<number, MarketItem> {
  const map: Record<number, MarketItem> = {}
  for (const raw of collectBulkRawItems(data)) {
    if (!raw || typeof raw !== 'object') continue
    const unwrapped = unwrapMarketItem(raw as Record<string, unknown>) as MarketItem & Record<string, unknown>
    if (typeof unwrapped.item_id !== 'number') continue
    const price = toNumber(unwrapped.price ?? unwrapped.rub_price ?? unwrapped.item_price)
    map[unwrapped.item_id] = normalizeMarketItem({
      ...unwrapped,
      price: price > 0 ? price : unwrapped.price
    })
  }
  return map
}

function collectBulkRawItems(data: unknown): unknown[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []

  const record = data as Record<string, unknown>
  const items = record.items
  if (Array.isArray(items)) return items
  if (items && typeof items === 'object') return Object.values(items as Record<string, unknown>)

  return Object.values(record).filter((v) => v && typeof v === 'object')
}

export function parseProfileBalance(profile: ProfileResponse | null): { balance: number; hold: number } {
  if (!profile) return { balance: 0, hold: 0 }
  const user = profile.user as (ProfileResponse['user'] & { balance?: unknown; hold?: unknown }) | undefined
  const balance = toNumber(profile.balance?.balance ?? user?.balance)
  const hold = toNumber(profile.balance?.hold ?? user?.hold)
  return { balance, hold }
}

export function formatRub(value: unknown): string {
  const num = toNumber(value)
  const amount = num.toLocaleString('ru-RU', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 2
  })
  return `${amount}\u00A0₽`
}

export function formatRubCompact(value: unknown): string {
  const num = toNumber(value)
  const abs = Math.abs(num)
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}\u00A0M\u00A0₽`
  }
  if (abs >= 100_000) {
    return `${Math.round(num / 1_000).toLocaleString('ru-RU')}\u00A0K\u00A0₽`
  }
  return formatRub(num)
}

export function formatCurrencyAmount(value: unknown, currency = 'rub'): string {
  const num = toNumber(value)
  const code = currency.toLowerCase()
  const amount = num.toLocaleString('ru-RU', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 2
  })
  if (code === 'rub') return `${amount}\u00A0₽`
  return `${amount} ${code.toUpperCase()}`
}

export function marketItemUrl(itemId: number): string {
  return `https://lzt.market/${itemId}/`
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}
