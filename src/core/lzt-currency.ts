
export interface LztCurrencyItem {
  title: string
  rate: number
  formattedRate?: string
  symbol: string
}

export interface LztCurrencyApiResponse {
  currencyList?: Record<string, LztCurrencyItem>
  lastUpdate?: number
  visitorCurrency?: string
  system_info?: unknown
}

export interface LztCurrencySnapshot {
  updatedAt: number
  source: 'lzt' | 'demo'

  baseCurrency: 'uah'
  currencies: Record<string, LztCurrencyItem>
}

export type EquivAsset = 'BTC' | 'ETH' | 'USDT' | 'TON' | 'LTC' | 'SOL' | 'USD' | 'EUR'

export const EQUIV_ASSETS: EquivAsset[] = ['BTC', 'ETH', 'USDT', 'TON', 'LTC', 'SOL', 'USD', 'EUR']

export const MARKET_RATE_PREVIEW = [
  'BTC',
  'ETH',
  'BNB',
  'USDT',
  'USDC',
  'TON',
  'LTC',
  'SOL',
  'USD',
  'EUR',
  'GBP',
  'RUB',
  'UAH',
  'CNY',
  'KZT',
  'BYN'
] as const

export type EquivBasis = 'available' | 'balance' | 'hold'

const FIAT_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RUB: '₽',
  UAH: '₴',
  CNY: '¥'
}

const HIGH_PRECISION_CRYPTO = new Set(['BTC', 'ETH'])
const MID_PRECISION_CRYPTO = new Set(['TON', 'LTC', 'SOL', 'BNB', 'USDC', 'USDT'])

export interface BalanceEquivItem {
  code: string
  title: string
  display: string
}

export function formatBalanceEquivDisplay(code: string, value: number): string {
  const symbol = equivAssetSymbol(code)
  const formatted = formatEquivAmount(value, code)
  return symbol ? `${symbol}${formatted}` : formatted
}

export function buildRubEquivItems(
  rubAmount: number,
  snapshot: LztCurrencySnapshot
): BalanceEquivItem[] {
  if (rubAmount <= 0) return []

  return sortedMarketRateCodes(snapshot).flatMap((code) => {
    const value = convertMarketAmount(rubAmount, 'RUB', code, snapshot)
    if (value === null) return []
    const meta = snapshot.currencies[code]
    return [{
      code,
      title: meta?.title ?? code,
      display: formatBalanceEquivDisplay(code, value)
    }]
  })
}

export function parseLztCurrencyResponse(data: unknown): LztCurrencySnapshot | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as LztCurrencyApiResponse
  const list = raw.currencyList
  if (!list || typeof list !== 'object') return null

  const currencies: Record<string, LztCurrencyItem> = {}
  for (const [key, item] of Object.entries(list)) {
    if (!item || typeof item.rate !== 'number' || item.rate <= 0) continue
    currencies[key.toUpperCase()] = {
      title: String(item.title ?? key),
      rate: item.rate,
      formattedRate: item.formattedRate,
      symbol: String(item.symbol ?? key)
    }
  }

  if (!currencies.RUB) return null

  const lastUpdate = raw.lastUpdate
  const updatedAt =
    typeof lastUpdate === 'number'
      ? lastUpdate > 1e12
        ? lastUpdate
        : lastUpdate * 1000
      : Date.now()

  return {
    updatedAt,
    source: (raw as { _hubDemo?: boolean })._hubDemo ? 'demo' : 'lzt',
    baseCurrency: 'uah',
    currencies
  }
}

export function convertMarketAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  snapshot: LztCurrencySnapshot
): number | null {
  if (amount <= 0) return 0
  const from = snapshot.currencies[fromCode.toUpperCase()]
  const to = snapshot.currencies[toCode.toUpperCase()]
  if (!from?.rate || !to?.rate) return null
  return (amount * from.rate) / to.rate
}

export function rubToEquiv(rubAmount: number, target: EquivAsset, snapshot: LztCurrencySnapshot): number | null {
  return convertMarketAmount(rubAmount, 'RUB', target, snapshot)
}

export function amountToEquiv(
  amount: number,
  fromCurrency: string,
  target: string,
  snapshot: LztCurrencySnapshot
): number | null {
  return convertMarketAmount(amount, fromCurrency, target, snapshot)
}

export function formatEquivAmount(amount: number, asset: string): string {
  const code = asset.toUpperCase()
  const opts: Intl.NumberFormatOptions =
    HIGH_PRECISION_CRYPTO.has(code)
      ? { maximumFractionDigits: 8, minimumFractionDigits: 0 }
      : MID_PRECISION_CRYPTO.has(code)
        ? { maximumFractionDigits: 6, minimumFractionDigits: 0 }
        : { maximumFractionDigits: 2, minimumFractionDigits: 2 }

  return amount.toLocaleString(undefined, opts)
}

export function equivAssetLabel(asset: string): string {
  return asset.toUpperCase()
}

export function equivAssetSymbol(asset: string): string {
  return FIAT_SYMBOLS[asset.toUpperCase()] ?? ''
}

export function sortedMarketRateCodes(snapshot: LztCurrencySnapshot): string[] {
  const order = MARKET_RATE_PREVIEW as readonly string[]
  return Object.keys(snapshot.currencies).sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.localeCompare(b)
  })
}
