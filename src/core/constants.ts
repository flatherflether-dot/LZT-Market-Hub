export const API_BASE_URL = 'https://prod-api.lzt.market'

export const RATE_LIMITS = {
  baseGet: { max: 300, windowMs: 60_000 },
  baseMutate: { max: 30, windowMs: 60_000 },
  search: { max: 120, windowMs: 60_000, minIntervalMs: 500 },
  edit: { max: 1000, windowMs: 60_000 },
  confirmBuy: { max: 1000, windowMs: 60_000 },
  deleteItem: { max: 300, windowMs: 60_000 },
  emailCode: { max: 300, windowMs: 60_000 },
  batch: { max: 20, windowMs: 60_000 },
  checkAccount: { max: 300, windowMs: 60_000 },
  letters: { max: 5, windowMs: 60_000, minIntervalMs: 12_000 },
  tags: { max: 30, windowMs: 60_000, minIntervalMs: 500 }
} as const

export type RateLimitBucket = keyof typeof RATE_LIMITS

export const MARKET_CATEGORIES = [
  { id: 'steam', label: 'Steam', categoryId: 1 },
  { id: 'telegram', label: 'Telegram', categoryId: 24 },
  { id: 'fortnite', label: 'Fortnite', categoryId: 9 },
  { id: 'valorant', label: 'Riot', categoryId: 13 },
  { id: 'origin', label: 'EA', categoryId: 3 },
  { id: 'uplay', label: 'Ubisoft', categoryId: 5 },
  { id: 'minecraft', label: 'Minecraft', categoryId: 28 },
  { id: 'supercell', label: 'Supercell', categoryId: 15 },
  { id: 'roblox', label: 'Roblox', categoryId: 31 },
  { id: 'world-of-tanks', label: 'World of Tanks', categoryId: 14 },
  { id: 'wot-blitz', label: 'WoT Blitz', categoryId: 16 },
  { id: 'epicgames', label: 'Epic Games', categoryId: 12 },
  { id: 'gifts', label: 'Gifts', categoryId: 30 },
  { id: 'escape-from-tarkov', label: 'Escape from Tarkov', categoryId: 18 },
  { id: 'socialclub', label: 'Social Club', categoryId: 7 },
  { id: 'discord', label: 'Discord', categoryId: 22 },
  { id: 'tiktok', label: 'TikTok', categoryId: 20 },
  { id: 'instagram', label: 'Instagram', categoryId: 10 },
  { id: 'battlenet', label: 'Battle.net', categoryId: 11 },
  { id: 'llm', label: 'LLM', categoryId: 6 },
  { id: 'genshin-impact', label: 'miHoYo', categoryId: 17 },
  { id: 'vpn', label: 'VPN', categoryId: 19 },
  { id: 'warface', label: 'Warface', categoryId: 4 },
  { id: 'hytale', label: 'Hytale', categoryId: 8 }
] as const

export const UPLOAD_CURRENCIES = [
  'rub',
  'uah',
  'kzt',
  'byn',
  'usd',
  'eur',
  'gbp',
  'cny',
  'try',
  'jpy',
  'brl'
] as const

export type UploadCurrency = (typeof UPLOAD_CURRENCIES)[number]

export interface MarketProxy {
  id?: number
  proxy_id?: number
  host?: string
  proxy_ip?: string
  port?: number
  proxy_port?: number
}

export type MarketCategoryId = (typeof MARKET_CATEGORIES)[number]['id']

export const CATEGORY_ID_MAP: Record<string, number> = Object.fromEntries(
  MARKET_CATEGORIES.map((c) => [c.id, c.categoryId])
)

export const ITEM_ORIGINS = [
  { value: 'personal', label: 'Personal (yours)' },
  { value: 'resale', label: 'Resale' },
  { value: 'autoreg', label: 'Autoreg' },
  { value: 'brute', label: 'Brute' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'stealer', label: 'Stealer' },
  { value: 'dummy', label: 'Dummy (Steam only)' },
  { value: 'self_registration', label: 'Self registration (Telegram only)' },
  { value: 'retrieve_via_support', label: 'Retrieved via support (Steam, Fortnite)' }
] as const

export interface ApiErrorBody {
  errors?: string[]
  error?: string
  message?: string
  system_info?: {
    rate_limit?: RateLimitInfo
    visitor_id?: number
    time?: number
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  bucket?: string
}

export interface MarketGuaranteeInfo {
  duration?: number
  class?: string
  durationPhrase?: string
  endDate?: unknown
  active?: unknown
  cancelled?: unknown
  remainingTime?: unknown
}

export interface MarketSellerInfo {
  user_id?: number
  username?: string
  sold_items_count?: number
  active_items_count?: number
  restore_percents?: number
  restore_data?: string
  avatar_date?: number
  is_banned?: number
}

export interface MarketPublicTag {
  tag_id: number
  title: string
  background_color?: string
}

export interface MarketAccountLink {
  link: string
  text: string
  iconClass?: string
}

export interface MarketItem {
  item_id: number
  title: string
  price: number
  item_state?: string
  category?: string
  published_date?: number
  category_id?: number
  publishedDate?: number
  buyer?: { user_id?: number; username?: string }
  discount_request?: DiscountRequestInfo
  discountRequest?: DiscountRequestInfo
  note?: string
  tags?: MarketTag[]
  tag_ids?: number[]
  account_avatar?: string
  game_title?: string
  inventory_value?: number
  steam_inventory_value?: number
  inventory?: Array<{ title: string; image?: string; price?: number }>
}

export interface MarketItemDetail extends MarketItem {
  title_en?: string
  description?: string
  description_en?: string
  descriptionPlain?: string
  descriptionEnPlain?: string
  descriptionHtml?: string
  descriptionEnHtml?: string
  information?: string
  item_origin?: string
  itemOriginPhrase?: string
  email_type?: string
  email_provider?: string
  item_domain?: string
  resale_item_origin?: string
  view_count?: number
  is_sticky?: number
  refreshed_date?: number
  edit_date?: number
  update_stat_date?: number
  pending_deletion_date?: number
  guarantee_duration?: number
  guarantee?: MarketGuaranteeInfo
  extended_guarantee?: number
  allow_ask_discount?: number | boolean
  auto_bump_period?: number
  price_currency?: string
  rub_price?: number
  priceWithSellerFee?: number
  priceWithSellerFeeLabel?: string
  max_discount_percent?: number
  discount?: boolean
  public_tag?: MarketPublicTag
  note_text?: string
  seller?: MarketSellerInfo
  accountLink?: string
  accountLinks?: MarketAccountLink[]
  imagePreviewLinks?: unknown
  emailLoginUrl?: string
  feedback_data?: string
  nsb?: number
  isPersonalAccount?: boolean
  canBumpItem?: boolean
  canNotBumpItemReason?: string
  canAutoBump?: boolean
  canStickItem?: boolean
  canUnstickItem?: boolean
  canOpenItem?: boolean
  canCloseItem?: boolean
  canEditItem?: boolean
  canDeleteItem?: boolean
  canValidateAccount?: boolean
  canResellItem?: boolean
  canChangePassword?: boolean
  canViewLoginData?: boolean
  canViewTempEmail?: boolean
  canViewEmailLoginData?: boolean
  canManagePublicTag?: boolean
  sameItemsCount?: number
  sameItemsIds?: number[]
  [key: string]: unknown
}

export interface MarketItemDetailResponse {
  item: MarketItemDetail
  canStickItem?: boolean
  canUnstickItem?: boolean
  canOpenItem?: boolean
  canCloseItem?: boolean
  canEditItem?: boolean
  canDeleteItem?: boolean
  canBumpItem?: boolean
  faveCount?: number
  itemLink?: string
  sameItemsIds?: number[]
  sameItemsCount?: number
}

export interface MarketTag {
  tag_id: number
  title: string
  isDefault?: boolean
  forOwnedAccountsOnly?: boolean
  bc?: string
}

export interface DiscountRequestInfo {
  discount_id?: number
  discountId?: number
  price?: number
  requested_price?: number
  requestedPrice?: number
  user_id?: number
  username?: string
  status?: string
}

export interface CustomDiscount {
  discount_id: number
  title?: string
  percent?: number
  item_ids?: number[]
}

export interface BatchJob {
  id?: string
  uri: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | boolean>
}

export interface MailLetter {
  subject?: string
  from?: string
  date?: string | number
  body?: string
  text?: string
}

export interface SearchResponse {
  items: MarketItem[]
  totalItems: number
  page: number
  perPage: number
}

export interface ProfileResponse {
  user?: {
    user_id: number
    username: string
  }
  balance?: {
    balance: number
    hold: number
  }
  items?: {
    active?: number
    sold?: number
  }
}

export interface PaymentRecord {
  payment_id: number
  amount: number
  type?: string
  created_at?: number
  comment?: string
}

export interface FastSellPayload {
  login?: string
  password?: string
  login_password?: string
  price: number
  category_id: number
  currency?: string
  item_origin?: string
  title?: string
  title_en?: string
  auto_generate_title?: boolean
  description?: string
  information?: string
  guarantee_duration?: number
  has_email_login_data?: boolean
  email_login_data?: string
  email_type?: 'native' | 'autoreg'
  tfa_secret?: string
  allow_ask_discount?: boolean
  resell_item_id?: number
  proxy_id?: number
  random_proxy?: boolean
  forceTempEmail?: boolean
  extra?: Record<string, unknown>
}

export type ItemAddPayload = Omit<
  FastSellPayload,
  'login' | 'password' | 'login_password' | 'has_email_login_data' | 'email_login_data' | 'tfa_secret' | 'extra'
>

export type GoodsCheckPayload = Pick<
  FastSellPayload,
  | 'login'
  | 'password'
  | 'login_password'
  | 'has_email_login_data'
  | 'email_login_data'
  | 'email_type'
  | 'tfa_secret'
  | 'random_proxy'
  | 'proxy_id'
  | 'extra'
>

export interface BulkActionPayload {
  action: string
  item_ids: number[]
  [key: string]: unknown
}

export interface CategorySearchParam {
  name: string
  input?: string
  description?: string
  values?: string[]
}

export interface CategoryGame {
  app_id: string
  title: string
  category_id?: number
}

export interface MarketClaim {
  claim_id: number
  item_id?: number
  claim_state?: string
  type?: string
  post_body?: string
  created_at?: number
  username?: string
}

export interface InventoryValueResponse {
  value?: number
  inventory_value?: number
  steam_inventory_value?: number
}

export interface AutoBuyPriceResponse {
  price?: number
  auto_buy_price?: number
}

export interface CheckGuaranteeResponse {
  can_refuse?: boolean
  status?: string
  message?: string
}

export interface BalanceEntry {
  currency: string
  balance?: number
  hold?: number
}

export interface PayoutService {
  service?: string
  title?: string
  min_amount?: number
  max_amount?: number
  fee?: number
  extra?: Record<string, unknown>
}

export interface MarketInvoice {
  invoice_id?: number
  payment_id?: string
  amount?: number
  currency?: string
  comment?: string
  status?: string
  url?: string
  url_callback?: string
  created_at?: number
  paid_at?: number
}

export interface AutoPayment {
  auto_payment_id?: number
  amount?: number
  currency?: string
  username?: string
  user_id?: number
  comment?: string
  created_at?: number
}

export interface TransferFeeInfo {
  fee?: number
  amount?: number
  currency?: string
}
