import {
  API_BASE_URL,
  type ApiErrorBody,
  type BulkActionPayload,
  type FastSellPayload,
  type GoodsCheckPayload,
  type ItemAddPayload,
  type RateLimitInfo
} from './constants'
import { type RateLimitBucket } from './constants'
import { withApiLocale } from './api-locale'
import { BULK_ITEM_FIELDS_INCLUDE } from './api-fields'
import {
  applyRateLimitFeedback,
  extractRateLimitFromBody,
  mergeRateLimit
} from './rate-limit-sync'
import { rateLimiter } from './rate-limiter'

export class LztApiError extends Error {
  status: number
  body: ApiErrorBody | null

  constructor(message: string, status: number, body: ApiErrorBody | null = null) {
    super(message)
    this.name = 'LztApiError'
    this.status = status
    this.body = body
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  bucket?: RateLimitBucket
  timeoutMs?: number
  retries?: number
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function parseRateLimit(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get('X-RateLimit-Limit')
  const remaining = headers.get('X-RateLimit-Remaining')
  const reset = headers.get('X-RateLimit-Reset')
  if (!limit || !remaining || !reset) return undefined
  return { limit: Number(limit), remaining: Number(remaining), reset: Number(reset) }
}

function isRetryRequest(errorBody: ApiErrorBody | null): boolean {
  if (!errorBody) return false
  const parts = [...(errorBody.errors ?? []), errorBody.error, errorBody.message].filter(Boolean) as string[]
  return parts.some((p) => p.includes('retry_request'))
}

function parseRateLimitFromHeaders(headers: Record<string, string>): RateLimitInfo | undefined {
  const limit = headers['X-RateLimit-Limit']
  const remaining = headers['X-RateLimit-Remaining']
  const reset = headers['X-RateLimit-Reset']
  if (!limit || !remaining || !reset) return undefined
  return { limit: Number(limit), remaining: Number(remaining), reset: Number(reset) }
}

function hasMarketBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.api?.market?.request)
}

function finalizeResponse<T>(
  json: unknown,
  headerLimit: RateLimitInfo | undefined
): { data: T; rateLimit?: RateLimitInfo } {
  const rateLimit = mergeRateLimit(headerLimit, extractRateLimitFromBody(json))
  if (rateLimit) applyRateLimitFeedback(rateLimit)
  return { data: json as T, rateLimit }
}

export class LztMarketClient {
  constructor(private getToken: () => string | null) {}

  private async requestViaBridge<T>(
    path: string,
    options: RequestOptions,
    token: string
  ): Promise<{ data: T; rateLimit?: RateLimitInfo }> {
    const { method = 'GET', body, retries = 3 } = options
    const params = withApiLocale(options.params)

    const result = await window.api.market.request(path, { method, params, body, token })
    const headerLimit = parseRateLimitFromHeaders(result.headers)
    const json = result.data
    const errorBody = json as ApiErrorBody | null

    if (result.status === 0) {
      const message = errorBody?.error || errorBody?.message || 'Network error'
      throw new LztApiError(message, 0, errorBody)
    }

    const rateLimit = mergeRateLimit(headerLimit, extractRateLimitFromBody(json))

    if (result.status === 429 && retries > 0) {
      const retryAfter = rateLimit?.reset ? rateLimit.reset * 1000 - Date.now() : 5_000
      await sleep(Math.max(retryAfter, 1_000))
      return this.requestViaBridge<T>(path, { ...options, retries: retries - 1 }, token)
    }

    if (isRetryRequest(errorBody) && retries > 0) {
      await sleep(2_000)
      return this.requestViaBridge<T>(path, { ...options, retries: retries - 1 }, token)
    }

    if (result.status < 200 || result.status >= 300) {
      if (rateLimit) applyRateLimitFeedback(rateLimit)
      const message =
        errorBody?.errors?.join(', ') || errorBody?.error || errorBody?.message || `HTTP ${result.status}`
      throw new LztApiError(message, result.status, errorBody)
    }

    return finalizeResponse<T>(json, headerLimit)
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; rateLimit?: RateLimitInfo }> {
    const {
      method = 'GET',
      body,
      bucket = method === 'GET' ? 'baseGet' : 'baseMutate',
      timeoutMs = 300_000,
      retries = 3
    } = options
    const params = withApiLocale(options.params)

    const token = this.getToken()
    if (!token) throw new LztApiError('API token not configured', 401)

    await rateLimiter.wait(bucket)

    if (hasMarketBridge()) {
      return this.requestViaBridge<T>(path, { ...options, params }, token)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(buildUrl(path, params), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      const headerLimit = parseRateLimit(response.headers)
      let json: unknown = null
      try {
        json = await response.json()
      } catch {
        json = null
      }

      const rateLimit = mergeRateLimit(headerLimit, extractRateLimitFromBody(json))

      if (response.status === 429 && retries > 0) {
        const retryAfter = rateLimit?.reset ? rateLimit.reset * 1000 - Date.now() : 5_000
        await sleep(Math.max(retryAfter, 1_000))
        return this.request<T>(path, { ...options, params, retries: retries - 1 })
      }

      const errorBody = json as ApiErrorBody | null
      if (isRetryRequest(errorBody) && retries > 0) {
        await sleep(2_000)
        return this.request<T>(path, { ...options, params, retries: retries - 1 })
      }

      if (!response.ok) {
        if (rateLimit) applyRateLimitFeedback(rateLimit)
        const message =
          errorBody?.errors?.join(', ') || errorBody?.error || errorBody?.message || `HTTP ${response.status}`
        throw new LztApiError(message, response.status, errorBody)
      }

      return finalizeResponse<T>(json, headerLimit)
    } finally {
      clearTimeout(timeout)
    }
  }

  searchCategory<T = import('./constants').SearchResponse>(
    category: string,
    params?: Record<string, string | number | boolean | undefined>
  ) {
    return this.request<T>(`/${category}`, { params, bucket: 'search' })
  }

  getProfile<T = import('./constants').ProfileResponse>() {
    return this.request<T>('/me')
  }

  getMyItems<T = import('./constants').SearchResponse>(userId: number, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(`/user/${userId}/items`, { params, bucket: 'search' })
  }

  getOrders<T = import('./constants').SearchResponse>(params?: Record<string, string | number | undefined>) {
    return this.request<T>('/user/orders', { params })
  }

  getFavorites<T = import('./constants').SearchResponse>(params?: Record<string, string | number | undefined>) {
    return this.request<T>('/fave', { params })
  }

  getItemStates<T = unknown>() {
    return this.request<T>('/items/state')
  }

  getPaymentsHistory<T = { payments?: import('./constants').PaymentRecord[] }>(
    params?: Record<string, string | number | undefined>
  ) {
    return this.request<T>('/user/payments', { params })
  }

  getItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}`, { bucket: 'search' })
  }

  openItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/open`, { method: 'POST', body: {} })
  }

  closeItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/close`, { method: 'POST', body: {} })
  }

  deleteItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}`, { method: 'DELETE', body: {}, bucket: 'deleteItem' })
  }

  fastBuy<T = unknown>(itemId: number, price: number) {
    return this.request<T>(`/${itemId}/fast-buy`, {
      method: 'POST',
      params: { price },
      bucket: 'checkAccount',
      timeoutMs: 300_000,
      retries: 100
    })
  }

  confirmBuy<T = unknown>(itemId: number, price: number) {
    return this.request<T>(`/${itemId}/confirm-buy`, {
      method: 'POST',
      params: { price },
      bucket: 'confirmBuy',
      timeoutMs: 120_000
    })
  }

  checkAccount<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/check-account`, {
      method: 'POST',
      body: {},
      bucket: 'checkAccount',
      timeoutMs: 300_000,
      retries: 100
    })
  }

  fastSell<T = unknown>(payload: FastSellPayload, extraParams?: Record<string, string>) {
    const body: Record<string, unknown> = {
      price: payload.price,
      category_id: payload.category_id,
      currency: payload.currency ?? 'rub',
      item_origin: payload.item_origin ?? 'personal'
    }

    if (payload.login_password) {
      body.login_password = payload.login_password
    } else {
      if (payload.login) body.login = payload.login
      if (payload.password) body.password = payload.password
    }

    if (payload.title) body.title = payload.title
    if (payload.title_en) body.title_en = payload.title_en
    if (payload.auto_generate_title) body.auto_generate_title = payload.auto_generate_title
    if (payload.description) body.description = payload.description
    if (payload.information) body.information = payload.information
    if (payload.guarantee_duration !== undefined) body.guarantee_duration = payload.guarantee_duration
    if (payload.has_email_login_data !== undefined) body.has_email_login_data = payload.has_email_login_data
    if (payload.email_login_data) body.email_login_data = payload.email_login_data
    if (payload.email_type) body.email_type = payload.email_type
    if (payload.tfa_secret) body.tfa_secret = payload.tfa_secret
    if (payload.allow_ask_discount !== undefined) body.allow_ask_discount = payload.allow_ask_discount
    if (payload.resell_item_id) body.resell_item_id = payload.resell_item_id
    if (payload.proxy_id) body.proxy_id = payload.proxy_id
    if (payload.random_proxy) body.random_proxy = payload.random_proxy
    if (payload.extra) body.extra = payload.extra

    return this.request<T>('/item/fast-sell', {
      method: 'POST',
      body,
      params: extraParams,
      bucket: 'checkAccount',
      timeoutMs: 300_000,
      retries: 100
    })
  }

  addMafile<T = unknown>(itemId: number, maFile: unknown) {
    const body =
      maFile && typeof maFile === 'object' && 'maFile' in (maFile as object)
        ? maFile
        : { maFile }
    return this.request<T>(`/${itemId}/mafile`, { method: 'POST', body })
  }

  getMafile<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/mafile`, { method: 'GET' })
  }

  removeMafile<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/mafile`, { method: 'DELETE', body: {} })
  }

  editItem<T = unknown>(itemId: number, params: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(`/${itemId}/edit`, { method: 'PUT', params, bucket: 'edit' })
  }

  bumpItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/bump`, { method: 'POST' })
  }

  autoBump<T = unknown>(itemId: number, hour: number) {
    return this.request<T>(`/${itemId}/auto-bump`, { method: 'POST', body: { hour } })
  }

  disableAutoBump<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/auto-bump/disable`, { method: 'POST' })
  }

  bulkAction<T = unknown>(payload: BulkActionPayload) {
    return this.request<T>('/items/bulk-action', { method: 'POST', body: payload })
  }

  bulkGetItems<T = unknown>(itemIds: number[]) {
    return this.request<T>('/bulk/items', {
      method: 'POST',
      body: { item_id: itemIds.slice(0, 250) },
      params: { fields_include: BULK_ITEM_FIELDS_INCLUDE }
    })
  }

  addToCart<T = unknown>(itemId: number) {
    return this.request<T>('/cart', { method: 'POST', body: { item_id: itemId } })
  }

  getCart<T = { items?: MarketItem[] }>() {
    return this.request<T>('/cart')
  }

  clearCart<T = unknown>() {
    return this.request<T>('/cart', { method: 'DELETE', body: {} })
  }

  removeFromCart<T = unknown>(itemId: number) {
    return this.request<T>('/cart', { method: 'DELETE', body: { item_id: itemId } })
  }

  addFavorite<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/star`, { method: 'POST' })
  }

  transferItem<T = unknown>(itemId: number, username: string, secretAnswer: string) {
    return this.request<T>(`/${itemId}/change-owner`, {
      method: 'POST',
      body: { username, secret_answer: secretAnswer }
    })
  }

  refuseGuarantee<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/refuse-guarantee`, { method: 'POST' })
  }

  getAiPrice<T = { price?: number }>(itemId: number) {
    return this.request<T>(`/${itemId}/ai-price`)
  }

  getProxies<T = unknown>() {
    return this.request<T>('/proxy')
  }

  addProxy<T = unknown>(params: {
    proxy_ip?: string
    proxy_port?: number
    proxy_user?: string
    proxy_pass?: string
    proxy_row?: string
  }) {
    return this.request<T>('/proxy', { method: 'POST', params })
  }

  deleteProxies<T = unknown>(proxyId?: number) {
    return this.request<T>('/proxy', { method: 'DELETE', params: proxyId ? { proxy_id: proxyId } : {} })
  }

  createImap<T = unknown>(params: { domain: string; imap_host: string; imap_port: number; imap_ssl?: boolean }) {
    return this.request<T>('/imap', {
      method: 'POST',
      body: {
        domain: params.domain,
        imap_server: params.imap_host,
        imap_host: params.imap_host,
        port: params.imap_port,
        imap_port: params.imap_port,
        secure: params.imap_ssl !== false,
        imap_ssl: params.imap_ssl !== false
      }
    })
  }

  listImap<T = unknown>() {
    return this.request<T>('/imap', { method: 'GET' })
  }

  deleteImap<T = unknown>(domain: string) {
    return this.request<T>('/imap', { method: 'DELETE', params: { domain } })
  }

  itemAdd<T = { item?: { item_id?: number }; item_id?: number }>(
    payload: ItemAddPayload,
    extraParams?: Record<string, string>
  ) {
    const body: Record<string, unknown> = {
      price: payload.price,
      category_id: payload.category_id,
      currency: payload.currency ?? 'rub',
      item_origin: payload.item_origin ?? 'personal'
    }

    if (payload.title) body.title = payload.title
    if (payload.title_en) body.title_en = payload.title_en
    if (payload.auto_generate_title) body.auto_generate_title = payload.auto_generate_title
    if (payload.description) body.description = payload.description
    if (payload.information) body.information = payload.information
    if (payload.guarantee_duration !== undefined) body.guarantee_duration = payload.guarantee_duration
    if (payload.allow_ask_discount !== undefined) body.allow_ask_discount = payload.allow_ask_discount
    if (payload.resell_item_id) body.resell_item_id = payload.resell_item_id
    if (payload.proxy_id) body.proxy_id = payload.proxy_id
    if (payload.random_proxy) body.random_proxy = payload.random_proxy
    if (payload.forceTempEmail) body.forceTempEmail = payload.forceTempEmail

    return this.request<T>('/item/add', {
      method: 'POST',
      body,
      params: extraParams,
      bucket: 'checkAccount',
      timeoutMs: 300_000,
      retries: 100
    })
  }

  getItemAddGoods<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/goods/add`)
  }

  checkItemGoods<T = unknown>(
    itemId: number,
    payload: GoodsCheckPayload = {},
    extraParams?: Record<string, string>
  ) {
    const body: Record<string, unknown> = {}

    if (payload.login_password) {
      body.login_password = payload.login_password
    } else {
      if (payload.login) body.login = payload.login
      if (payload.password) body.password = payload.password
    }

    if (payload.has_email_login_data !== undefined) body.has_email_login_data = payload.has_email_login_data
    if (payload.email_login_data) body.email_login_data = payload.email_login_data
    if (payload.email_type) body.email_type = payload.email_type
    if (payload.tfa_secret) body.tfa_secret = payload.tfa_secret
    if (payload.random_proxy) body.random_proxy = payload.random_proxy
    if (payload.proxy_id) body.proxy_id = payload.proxy_id
    if (payload.extra) body.extra = payload.extra

    return this.request<T>(`/${itemId}/goods/check`, {
      method: 'POST',
      body,
      params: extraParams,
      bucket: 'checkAccount',
      timeoutMs: 300_000,
      retries: 100
    })
  }

  getGuardCode<T = { code?: string; guard_code?: string }>(itemId: number) {
    return this.request<T>(`/${itemId}/guard-code`)
  }

  getEmailCode<T = { code?: string; email_code?: string }>(itemId: number) {
    return this.request<T>(`/email-code`, { params: { item_id: itemId }, bucket: 'emailCode' })
  }

  getItemLetters<T = { letters?: import('./constants').MailLetter[] }>(itemId: number) {
    return this.request<T>(`/${itemId}/letters`, { bucket: 'letters', timeoutMs: 120_000, retries: 50 })
  }

  getLetters<T = unknown>(params?: Record<string, string | number>) {
    return this.request<T>('/letters', { params, bucket: 'letters', timeoutMs: 120_000, retries: 50 })
  }

  getTempEmailPassword<T = { password?: string }>(itemId: number) {
    return this.request<T>(`/${itemId}/temp-email-password`, { bucket: 'baseGet' })
  }

  editItemNote<T = unknown>(itemId: number, text: string) {
    return this.request<T>(`/${itemId}/note`, { method: 'PUT', params: { text } })
  }

  deleteItemNote<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/note`, { method: 'DELETE', body: {} })
  }

  changeItemPassword<T = unknown>(itemId: number, password: string) {
    return this.request<T>(`/${itemId}/change-password`, { method: 'POST', body: { password } })
  }

  listTags<T = { tags?: import('./constants').MarketTag[] }>() {
    return this.request<T>('/user/tags', { bucket: 'tags' })
  }

  createTag<T = unknown>(title: string) {
    return this.request<T>('/user/tags', { method: 'POST', body: { title }, bucket: 'tags' })
  }

  updateTag<T = unknown>(tagId: number, title: string) {
    return this.request<T>(`/user/tags/${tagId}`, { method: 'PUT', body: { title }, bucket: 'tags' })
  }

  deleteTag<T = unknown>(tagId: number) {
    return this.request<T>(`/user/tags/${tagId}`, { method: 'DELETE', body: {}, bucket: 'tags' })
  }

  addTagToItem<T = unknown>(itemId: number, tagId: number) {
    return this.request<T>(`/${itemId}/tag/add`, { method: 'POST', params: { tag_id: tagId }, bucket: 'tags' })
  }

  removeTagFromItem<T = unknown>(itemId: number, tagId: number) {
    return this.request<T>(`/${itemId}/tag/delete`, { method: 'POST', params: { tag_id: tagId }, bucket: 'tags' })
  }

  addPublicTag<T = unknown>(itemId: number, tagId: number) {
    return this.request<T>(`/${itemId}/public-tag/add`, { method: 'POST', params: { tag_id: tagId }, bucket: 'tags' })
  }

  removePublicTag<T = unknown>(itemId: number, tagId: number) {
    return this.request<T>(`/${itemId}/public-tag/delete`, { method: 'POST', params: { tag_id: tagId }, bucket: 'tags' })
  }

  reviewDiscountRequest<T = unknown>(itemId: number, approve: boolean, discountId?: number) {
    return this.request<T>(`/${itemId}/discount-request/review`, {
      method: 'POST',
      body: { approve: approve ? 1 : 0, ...(discountId ? { discount_id: discountId } : {}) }
    })
  }

  cancelDiscountRequest<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/discount-request`, { method: 'DELETE', body: {} })
  }

  getCustomDiscounts<T = { discounts?: import('./constants').CustomDiscount[] }>() {
    return this.request<T>('/custom-discount')
  }

  createCustomDiscount<T = unknown>(payload: { title: string; percent: number; item_ids?: number[] }) {
    return this.request<T>('/custom-discount', { method: 'POST', body: payload })
  }

  updateCustomDiscount<T = unknown>(discountId: number, payload: Record<string, unknown>) {
    return this.request<T>(`/custom-discount/${discountId}`, { method: 'PUT', body: payload })
  }

  deleteCustomDiscount<T = unknown>(discountId: number) {
    return this.request<T>(`/custom-discount/${discountId}`, { method: 'DELETE', body: {} })
  }

  batchExecute<T = unknown>(jobs: import('./constants').BatchJob[]) {
    return this.request<T>('/batch', { method: 'POST', body: jobs, bucket: 'batch' })
  }

  bulkTagItems(itemIds: number[], tagId: number): Promise<{ ok: number; failed: number }> {
    return Promise.all(
      itemIds.map((id) =>
        this.addTagToItem(id, tagId).then(
          () => true,
          () => false
        )
      )
    ).then((results) => ({
      ok: results.filter(Boolean).length,
      failed: results.filter((r) => !r).length
    }))
  }

  stickItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/stick`, { method: 'POST', body: {} })
  }

  unstickItem<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/stick`, { method: 'DELETE', body: {} })
  }

  getAutoBuyPrice<T = import('./constants').AutoBuyPriceResponse>(itemId: number) {
    return this.request<T>(`/${itemId}/auto-buy-price`)
  }

  getSteamInventoryValue<T = import('./constants').InventoryValueResponse>(itemId: number) {
    return this.request<T>(`/${itemId}/inventory-value`, { bucket: 'checkAccount', timeoutMs: 120_000 })
  }

  updateSteamInventoryValue<T = import('./constants').InventoryValueResponse>(itemId: number) {
    return this.request<T>(`/${itemId}/update-inventory`, { method: 'POST', body: {}, bucket: 'checkAccount', timeoutMs: 120_000 })
  }

  confirmSda<T = unknown>(itemId: number) {
    return this.request<T>(`/${itemId}/confirm-sda`, { method: 'POST', body: {} })
  }

  getMafileConfirmationCode<T = { code?: string; guard_code?: string }>(itemId: number) {
    return this.request<T>(`/${itemId}/steam-mafile-code`)
  }

  getCategoryParams<T = { params?: import('./constants').CategorySearchParam[] }>(category: string) {
    return this.request<T>(`/${category}/params`)
  }

  getCategoryGames<T = { games?: import('./constants').CategoryGame[] }>(category: string) {
    return this.request<T>(`/${category}/games`)
  }

  getViewedHistory<T = import('./constants').SearchResponse>(params?: Record<string, string | number>) {
    return this.request<T>('/viewed', { params })
  }

  getClaims<T = { claims?: import('./constants').MarketClaim[] }>(params?: Record<string, string>) {
    return this.request<T>('/claims', { params })
  }

  createClaim<T = unknown>(itemId: number, postBody: string) {
    return this.request<T>('/claims', { method: 'POST', body: { item_id: itemId, post_body: postBody } })
  }

  checkGuarantee<T = import('./constants').CheckGuaranteeResponse>(itemId: number) {
    return this.request<T>(`/${itemId}/check-guarantee`, { method: 'POST', body: {} })
  }

  downloadUserData(type: 'orders' | 'accounts' | 'sold' = 'orders') {
    return this.request<string | Record<string, unknown>>(`/user/${type}/download`, { timeoutMs: 300_000 })
  }

  findForumUser<T = { user?: { user_id: number; username: string } }>(username: string) {
    if (typeof window === 'undefined' || !window.api?.forum?.findUser) {
      throw new LztApiError('Forum API bridge unavailable', 0)
    }
    return window.api.forum.findUser(username.trim()) as Promise<T>
  }

  getBalances<T = { balances?: import('./constants').BalanceEntry[] }>() {
    return this.request<T>('/balance/exchange', { bucket: 'baseGet' })
  }

  getCurrency<T = import('./lzt-currency').LztCurrencyApiResponse>() {
    return this.request<T>('/currency', { bucket: 'baseGet' })
  }

  exchangeBalance<T = unknown>(payload: {
    amount: number
    currency_from: string
    currency_to: string
  }) {
    return this.request<T>('/balance/exchange', { method: 'POST', body: payload, bucket: 'baseMutate' })
  }

  transferMoney<T = unknown>(payload: {
    amount: number
    currency: string
    secret_answer: string
    username?: string
    user_id?: number
    comment?: string
    transfer_hold?: boolean
    hold_length_value?: number
    hold_length_option?: string
  }) {
    return this.request<T>('/balance/transfer', { method: 'POST', body: payload, bucket: 'baseMutate' })
  }

  getTransferFee<T = import('./constants').TransferFeeInfo>(params: {
    amount: number
    currency: string
    username?: string
    user_id?: number
  }) {
    return this.request<T>('/balance/transfer/fee', { params, bucket: 'baseGet' })
  }

  cancelTransfer<T = unknown>(paymentId: number) {
    return this.request<T>('/balance/transfer/cancel', { method: 'POST', body: { payment_id: paymentId }, bucket: 'baseMutate' })
  }

  getPayoutServices<T = { services?: import('./constants').PayoutService[] }>() {
    return this.request<T>('/balance/payout/services', { bucket: 'baseGet' })
  }

  createPayout<T = unknown>(payload: {
    service: string
    wallet: string
    amount: number
    currency: string
    include_fee?: boolean
    extra?: Record<string, unknown>
  }) {
    return this.request<T>('/balance/payout', { method: 'POST', body: payload, bucket: 'baseMutate' })
  }

  listAutoPayments<T = { auto_payments?: import('./constants').AutoPayment[] }>() {
    return this.request<T>('/auto-payments', { bucket: 'baseGet' })
  }

  createAutoPayment<T = unknown>(payload: {
    amount: number
    currency: string
    username?: string
    user_id?: number
    comment?: string
  }) {
    return this.request<T>('/auto-payment', { method: 'POST', body: payload, bucket: 'baseMutate' })
  }

  deleteAutoPayment<T = unknown>(autoPaymentId: number) {
    return this.request<T>('/auto-payment', { method: 'DELETE', params: { auto_payment_id: autoPaymentId }, bucket: 'baseMutate' })
  }

  getInvoice<T = { invoice?: import('./constants').MarketInvoice }>(invoiceId: number) {
    return this.request<T>('/invoice', { params: { invoice_id: invoiceId }, bucket: 'baseGet' })
  }

  createInvoice<T = { invoice?: import('./constants').MarketInvoice; url?: string }>(payload: {
    amount: number
    currency: string
    payment_id: string
    comment?: string
    url_callback?: string
    url_success?: string
    lifetime?: number
    merchant_id?: number
  }) {
    return this.request<T>('/invoice', { method: 'POST', body: payload, bucket: 'baseMutate' })
  }

  listInvoices<T = { invoices?: import('./constants').MarketInvoice[] }>(params?: Record<string, string | number>) {
    return this.request<T>('/invoice/list', { params, bucket: 'baseGet' })
  }
}

type MarketItem = import('./constants').MarketItem

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let clientInstance: LztMarketClient | null = null

export function getApiClient(): LztMarketClient {
  if (!clientInstance) {
    clientInstance = new LztMarketClient(() => null)
  }
  return clientInstance
}

export function initApiClient(getToken: () => string | null): LztMarketClient {
  clientInstance = new LztMarketClient(getToken)
  return clientInstance
}
