import {
  CATEGORY_ID_MAP,
  UPLOAD_CURRENCIES,
  type FastSellPayload,
  type GoodsCheckPayload,
  type ItemAddPayload,
  type MarketCategoryId
} from './constants'

export { UPLOAD_CURRENCIES } from './constants'

export const EMAIL_LOGIN_REQUIRED_CATEGORY_IDS = new Set([9, 12, 18])

export const TFA_SECRET_CATEGORY_IDS = new Set([10, 31])

export const COOKIES_EXTRA_CATEGORY_IDS = new Set([9, 12])

export const STEAM_CATEGORY_ID = 1

export const GUARANTEE_OPTIONS = [
  { value: '', labelKey: 'upload.guarantee.default' as const },
  { value: '0', labelKey: 'upload.guarantee.none' as const },
  { value: '43200', labelKey: 'upload.guarantee.12h' as const },
  { value: '86400', labelKey: 'upload.guarantee.24h' as const },
  { value: '259200', labelKey: 'upload.guarantee.3d' as const }
]

export const EMAIL_TYPE_OPTIONS = [
  { value: '', labelKey: 'upload.emailType.default' as const },
  { value: 'native', labelKey: 'upload.emailType.native' as const },
  { value: 'autoreg', labelKey: 'upload.emailType.autoreg' as const }
]

export const CURRENCY_OPTIONS = UPLOAD_CURRENCIES.map((c) => ({
  value: c,
  label: c.toUpperCase()
}))

export const ORIGIN_CATEGORY_RESTRICTIONS: Record<string, number[]> = {
  dummy: [1],
  self_registration: [24],
  retrieve_via_support: [1, 9]
}

export const ALL_UPLOAD_CSV_COLUMNS = [
  'login',
  'password',
  'login_password',
  'email_login',
  'cookies',
  'proxy',
  'tfa_secret',
  'title',
  'title_en',
  'price',
  'mafile',
  'resell_item_id'
] as const

export type UploadCsvColumn = (typeof ALL_UPLOAD_CSV_COLUMNS)[number]

export interface ParsedUploadRow {
  login: string
  password: string
  loginPassword?: string
  emailLogin?: string
  cookies?: string
  proxy?: string
  tfaSecret?: string
  title?: string
  titleEn?: string
  price?: number
  mafile?: string
  resellItemId?: number
}

export interface CategoryUploadRequirements {
  categoryId: number
  requiresEmailLogin: boolean
  supportsTfaSecret: boolean
  supportsCookies: boolean
  supportsMafile: boolean
  optionalCsvColumns: UploadCsvColumn[]
  hintKey: string
}

const STEAM_OPTIONAL_COLS: UploadCsvColumn[] = ['title', 'title_en', 'price', 'proxy', 'mafile', 'resell_item_id']

const REQUIREMENTS_BY_CATEGORY: Record<string, Omit<CategoryUploadRequirements, 'categoryId'>> = {
  fortnite: {
    requiresEmailLogin: true,
    supportsTfaSecret: false,
    supportsCookies: true,
    supportsMafile: false,
    optionalCsvColumns: ['email_login', 'cookies', 'proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.fortnite'
  },
  epicgames: {
    requiresEmailLogin: true,
    supportsTfaSecret: false,
    supportsCookies: true,
    supportsMafile: false,
    optionalCsvColumns: ['email_login', 'cookies', 'proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.epicgames'
  },
  'escape-from-tarkov': {
    requiresEmailLogin: true,
    supportsTfaSecret: false,
    supportsCookies: false,
    supportsMafile: false,
    optionalCsvColumns: ['email_login', 'proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.eft'
  },
  instagram: {
    requiresEmailLogin: false,
    supportsTfaSecret: true,
    supportsCookies: false,
    supportsMafile: false,
    optionalCsvColumns: ['tfa_secret', 'proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.instagram'
  },
  roblox: {
    requiresEmailLogin: false,
    supportsTfaSecret: true,
    supportsCookies: false,
    supportsMafile: false,
    optionalCsvColumns: ['tfa_secret', 'proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.roblox'
  },
  telegram: {
    requiresEmailLogin: false,
    supportsTfaSecret: false,
    supportsCookies: false,
    supportsMafile: false,
    optionalCsvColumns: ['proxy', 'title', 'title_en', 'price', 'resell_item_id'],
    hintKey: 'upload.hint.telegram'
  },
  steam: {
    requiresEmailLogin: false,
    supportsTfaSecret: false,
    supportsCookies: false,
    supportsMafile: true,
    optionalCsvColumns: STEAM_OPTIONAL_COLS,
    hintKey: 'upload.hint.steam'
  }
}

const DEFAULT_OPTIONAL_COLS: UploadCsvColumn[] = [
  'proxy',
  'title',
  'title_en',
  'price',
  'resell_item_id'
]

const DEFAULT_REQUIREMENTS: Omit<CategoryUploadRequirements, 'categoryId'> = {
  requiresEmailLogin: false,
  supportsTfaSecret: false,
  supportsCookies: false,
  supportsMafile: false,
  optionalCsvColumns: DEFAULT_OPTIONAL_COLS,
  hintKey: 'upload.hint.default'
}

export function getCategoryUploadRequirements(category: string): CategoryUploadRequirements {
  const categoryId = CATEGORY_ID_MAP[category] ?? 1
  const base = REQUIREMENTS_BY_CATEGORY[category] ?? DEFAULT_REQUIREMENTS
  return { categoryId, ...base }
}

export function isOriginAllowedForCategory(origin: string, categoryId: number): boolean {
  const restricted = ORIGIN_CATEGORY_RESTRICTIONS[origin]
  if (!restricted) return true
  return restricted.includes(categoryId)
}

export function getCsvTemplateForCategory(category: MarketCategoryId | string): string {
  const req = getCategoryUploadRequirements(category)
  const cols = ['login', 'password', ...req.optionalCsvColumns]
  return `${[...new Set(cols)].join(',')}\n`
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function parseCsvRowValues(line: string, columns: UploadCsvColumn[]): Record<UploadCsvColumn, string> {
  const parts = parseCsvLine(line)
  const row = {} as Record<UploadCsvColumn, string>
  for (const col of ALL_UPLOAD_CSV_COLUMNS) {
    const idx = columns.indexOf(col)
    row[col] = idx >= 0 ? (parts[idx] ?? '').trim() : ''
  }
  return row
}

export function parseCsvHeader(headerLine: string): UploadCsvColumn[] {
  return headerLine
    .trim()
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\s/g, '_'))
    .filter((col): col is UploadCsvColumn => ALL_UPLOAD_CSV_COLUMNS.includes(col as UploadCsvColumn))
}

export function parsedValuesToRow(values: Record<UploadCsvColumn, string>): ParsedUploadRow {
  const resellRaw = values.resell_item_id
  const resellItemId = resellRaw ? Number(resellRaw) : undefined
  const priceRaw = values.price
  const price = priceRaw ? Number(priceRaw) : undefined

  return {
    login: values.login,
    password: values.password,
    loginPassword: values.login_password || undefined,
    emailLogin: values.email_login || undefined,
    cookies: values.cookies || undefined,
    proxy: values.proxy || undefined,
    tfaSecret: values.tfa_secret || undefined,
    title: values.title || undefined,
    titleEn: values.title_en || undefined,
    price: price && !Number.isNaN(price) && price >= 1 ? price : undefined,
    mafile: values.mafile || undefined,
    resellItemId: resellItemId && !Number.isNaN(resellItemId) ? resellItemId : undefined
  }
}

export function buildExtraFromRow(row: Pick<ParsedUploadRow, 'cookies' | 'proxy'>): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {}
  if (row.cookies) extra.cookies = row.cookies
  if (row.proxy) extra.proxy = row.proxy
  return Object.keys(extra).length ? extra : undefined
}

export function parseMafileJson(raw: string): unknown {
  const parsed = JSON.parse(raw) as unknown
  if (parsed && typeof parsed === 'object' && 'maFile' in parsed) return parsed
  return parsed
}

export function hasValidCredentials(row: Pick<ParsedUploadRow, 'login' | 'password' | 'loginPassword'>): boolean {
  if (row.loginPassword) return row.loginPassword.includes(':')
  return Boolean(row.login && row.password)
}

export interface ListingFormDefaults {
  currency: string
  origin: string
  defaultTitle: string
  defaultTitleEn: string
  autoGenerateTitle: boolean
  description: string
  information: string
  guaranteeDuration: string
  allowAskDiscount: boolean
  resellItemId: string
  proxyId: string
  randomProxy: boolean
  forceTempEmail: boolean
  emailType: string
}

export interface UploadRowPayloadInput {
  row: ParsedUploadRow
  categoryId: number
  form: ListingFormDefaults
  priceNum: number
  title?: string
  titleEn?: string
  effectiveResellId?: number
  extra?: Record<string, unknown>
}

function parseGuarantee(raw: string): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

function parseProxyId(raw: string): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

export function buildItemAddPayload(input: UploadRowPayloadInput): ItemAddPayload {
  const { row, categoryId, form, priceNum, title, titleEn, effectiveResellId } = input
  const guarantee = parseGuarantee(form.guaranteeDuration)
  const formProxyId = parseProxyId(form.proxyId)
  const rowTitle = row.title || title
  const rowTitleEn = row.titleEn || titleEn

  return {
    price: row.price ?? priceNum,
    category_id: categoryId,
    currency: form.currency,
    item_origin: form.origin,
    ...(rowTitle ? { title: rowTitle } : {}),
    ...(rowTitleEn ? { title_en: rowTitleEn } : {}),
    ...(form.autoGenerateTitle ? { auto_generate_title: true } : {}),
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.information.trim() ? { information: form.information.trim() } : {}),
    ...(guarantee !== undefined ? { guarantee_duration: guarantee } : {}),
    ...(form.allowAskDiscount ? { allow_ask_discount: true } : {}),
    ...(effectiveResellId ? { resell_item_id: effectiveResellId } : {}),
    ...(!form.randomProxy && formProxyId ? { proxy_id: formProxyId } : {}),
    ...(form.randomProxy ? { random_proxy: true } : {}),
    ...(form.forceTempEmail ? { forceTempEmail: true } : {})
  }
}

export function buildGoodsCheckPayload(input: UploadRowPayloadInput): GoodsCheckPayload {
  const { row, form, extra } = input
  const formProxyId = parseProxyId(form.proxyId)

  return {
    ...(row.loginPassword
      ? { login_password: row.loginPassword }
      : { login: row.login, password: row.password }),
    ...(form.randomProxy ? { random_proxy: true } : {}),
    ...(!form.randomProxy && formProxyId ? { proxy_id: formProxyId } : {}),
    ...(row.emailLogin
      ? {
          has_email_login_data: true,
          email_login_data: row.emailLogin,
          ...(form.emailType ? { email_type: form.emailType as 'native' | 'autoreg' } : {})
        }
      : {}),
    ...(row.tfaSecret ? { tfa_secret: row.tfaSecret } : {}),
    ...(extra ? { extra } : {})
  }
}

export function buildFastSellPayload(input: UploadRowPayloadInput): FastSellPayload {
  return {
    ...buildItemAddPayload(input),
    ...buildGoodsCheckPayload(input)
  }
}
