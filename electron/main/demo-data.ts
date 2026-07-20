import type Database from 'better-sqlite3'
import { getDatabase } from './database'
import { recomputeMatchesForCompetitor } from './competitor-service'

export const DEMO_TOKEN = 'lzt-demo-local-dev-token'
export const DEMO_USER_ID = 999001
export const DEMO_COMPETITOR_ID = 888002

interface DemoItem {
  item_id: number
  title: string
  price: number
  item_state?: string
  category?: string
  category_id?: number
}

const DEMO_MY_ITEMS: DemoItem[] = [
  { item_id: 100201, title: 'Steam | CS2 Prime | 1200 ч | 15 медалей', price: 890, item_state: 'active', category: 'steam', category_id: 1 },
  { item_id: 100202, title: 'Steam | Dota 2 | MMR 4200 | 180 скинов', price: 1450, item_state: 'active', category: 'steam', category_id: 1 },
  { item_id: 100203, title: 'Telegram | Premium 12 мес | чистый номер', price: 320, item_state: 'active', category: 'telegram', category_id: 24 },
  { item_id: 100204, title: 'Discord | Nitro 1 год | метод оплаты', price: 540, item_state: 'active', category: 'discord', category_id: 22 },
  { item_id: 100205, title: 'Valorant | Skins 45 | Rank Gold 2', price: 780, item_state: 'active', category: 'valorant', category_id: 13 },
  { item_id: 100206, title: 'Fortnite | 80 скинов | Battle Pass S5', price: 620, item_state: 'active', category: 'fortnite', category_id: 9 },
  { item_id: 100207, title: 'Steam | Rust | 900 ч | все DLC', price: 410, item_state: 'active', category: 'steam', category_id: 1 },
  { item_id: 100208, title: 'Telegram | 2FA | username @market_hub', price: 190, item_state: 'active', category: 'telegram', category_id: 24 },
  { item_id: 100209, title: 'Minecraft | Java + Bedrock | cape Migrator', price: 350, item_state: 'active', category: 'minecraft', category_id: 28 },
  { item_id: 100210, title: 'Steam | GTA V | 50M$ | modded', price: 280, item_state: 'active', category: 'steam', category_id: 1 },
  { item_id: 100211, title: 'Discord | aged 2020 | verified email', price: 95, item_state: 'active', category: 'discord', category_id: 22 },
  { item_id: 100212, title: 'Roblox | Premium | 12k robux spent', price: 430, item_state: 'active', category: 'roblox', category_id: 31 }
]

const DEMO_COMPETITOR_ITEMS: DemoItem[] = [
  { item_id: 200001, title: 'Steam | CS2 | Prime | 800 ч', price: 720, item_state: 'active', category: 'steam' },
  { item_id: 200002, title: 'Steam | CS2 | Prime | 2000 ч', price: 1100, item_state: 'active', category: 'steam' },
  { item_id: 200003, title: 'Telegram | Premium 6 мес', price: 260, item_state: 'active', category: 'telegram' },
  { item_id: 200004, title: 'Valorant | 20 skins | Silver 3', price: 490, item_state: 'active', category: 'valorant' },
  { item_id: 200005, title: 'Discord | Nitro Basic 3 мес', price: 180, item_state: 'active', category: 'discord' },
  { item_id: 200006, title: 'Fortnite | 40 skins', price: 380, item_state: 'active', category: 'fortnite' },
  { item_id: 200007, title: 'Steam | Rust | 500 ч', price: 340, item_state: 'active', category: 'steam' },
  { item_id: 200008, title: 'Minecraft | Java Premium', price: 290, item_state: 'active', category: 'minecraft' }
]

const DEMO_SEARCH_ITEMS: DemoItem[] = [
  { item_id: 100001, title: 'Steam | CS2 Prime | fresh', price: 450, item_state: 'active', category: 'steam' },
  { item_id: 100002, title: 'Steam | CS2 | 500 ч | Prime', price: 520, item_state: 'active', category: 'steam' },
  { item_id: 100003, title: 'Steam | Dota 2 | recalibration', price: 310, item_state: 'active', category: 'steam' },
  { item_id: 100004, title: 'Telegram | session + 2FA', price: 85, item_state: 'active', category: 'telegram' },
  { item_id: 100005, title: 'Telegram | Premium gift 3 мес', price: 140, item_state: 'active', category: 'telegram' },
  { item_id: 100006, title: 'Discord | Nitro | full access', price: 220, item_state: 'active', category: 'discord' },
  { item_id: 100007, title: 'Valorant | EU | unranked', price: 120, item_state: 'active', category: 'valorant' },
  { item_id: 100008, title: 'Fortnite | OG skins bundle', price: 890, item_state: 'active', category: 'fortnite' },
  { item_id: 100009, title: 'Steam | Rust | starter', price: 199, item_state: 'active', category: 'steam' },
  { item_id: 100010, title: 'Minecraft | Hypixel MVP+', price: 560, item_state: 'active', category: 'minecraft' },
  ...DEMO_MY_ITEMS.slice(0, 4)
]

const ALL_DEMO_ITEMS = [...DEMO_SEARCH_ITEMS, ...DEMO_MY_ITEMS, ...DEMO_COMPETITOR_ITEMS]

let demoCartIds = new Set<number>([100001, 100004])
let demoFavoriteIds = new Set<number>([100003])

interface DemoTag {
  tag_id: number
  title: string
}

const DEMO_USER_TAGS: DemoTag[] = [
  { tag_id: 10, title: 'Flip' },
  { tag_id: 11, title: 'Hold' },
  { tag_id: 12, title: 'Premium' },
  { tag_id: 13, title: 'Quick sell' }
]

const demoItemTags = new Map<number, DemoTag[]>()

function getDemoItemTags(itemId: number): DemoTag[] {
  if (demoItemTags.has(itemId)) return [...demoItemTags.get(itemId)!]
  return [{ tag_id: 10, title: 'Flip' }]
}

function setDemoItemTags(itemId: number, tags: DemoTag[]): void {
  demoItemTags.set(itemId, tags)
}

export function isDemoToken(token: string | null | undefined): boolean {
  return token === DEMO_TOKEN
}

function findDemoItem(itemId: number): DemoItem | undefined {
  return ALL_DEMO_ITEMS.find((i) => i.item_id === itemId)
}

function buildDemoItemDetail(base: DemoItem): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000)
  const category = base.category ?? 'other'
  const common: Record<string, unknown> = {
    ...base,
    title_en: `${base.title} (EN)`,
    item_state: base.item_state ?? 'active',
    description: `Public description for ${base.title}. Verified seller, fast delivery.`,
    description_en: `Public EN description for ${base.title}.`,
    information: 'Private buyer info: change password after purchase.',
    item_origin: category === 'telegram' ? 'self_registration' : 'personal',
    itemOriginPhrase: category === 'telegram' ? 'Self registered' : 'Personal account',
    view_count: 120 + (base.item_id % 40),
    published_date: now - 86400 * 12,
    refreshed_date: now - 3600 * 3,
    edit_date: now - 86400,
    update_stat_date: now - 7200,
    is_sticky: 0,
    guarantee_duration: 86400,
    guarantee: {
      duration: 86400,
      durationPhrase: '24 hours',
      active: true,
      cancelled: false,
      remainingTime: 82800
    },
    allow_ask_discount: 1,
    price_currency: 'rub',
    rub_price: base.price,
    priceWithSellerFee: Math.round(base.price * 0.97),
    priceWithSellerFeeLabel: `${Math.round(base.price * 0.97)} ₽`,
    max_discount_percent: 30,
    tags: getDemoItemTags(base.item_id),
    note_text: 'Demo private note',
    note: 'Demo private note',
    canBumpItem: true,
    canStickItem: true,
    canUnstickItem: false,
    canOpenItem: false,
    canCloseItem: true,
    canEditItem: true,
    canDeleteItem: true,
    canAutoBump: true,
    canValidateAccount: true,
    seller: {
      user_id: DEMO_USER_ID,
      username: 'demo_seller',
      sold_items_count: 47,
      active_items_count: 12,
      restore_percents: 98,
      restore_data: '98%'
    },
    accountLinks: [{ link: `https://lzt.market/${base.item_id}/`, text: 'Open on Market', iconClass: 'fa-external-link' }]
  }

  if (category === 'discord') {
    return {
      ...common,
      discord_register_date: '2020-05-12',
      discord_verified: true,
      discord_nitro: false,
      discord_guilds: 3,
      discord_phone: false
    }
  }
  if (category === 'steam') {
    return {
      ...common,
      steam_level: 12,
      steam_game_count: 45,
      steam_balance: 0,
      steam_country: 'RU',
      steam_hours: 1200,
      steam_inventory_value: 1250,
      steam_cs2_prime: true
    }
  }
  if (category === 'telegram') {
    return {
      ...common,
      telegram_premium: true,
      telegram_premium_expires: now + 86400 * 180,
      telegram_country: 'RU',
      telegram_spam_block: false,
      telegram_id: 7123456789
    }
  }
  if (category === 'valorant') {
    return {
      ...common,
      riot_valorant_rank: 'Gold 2',
      riot_valorant_skin_count: 45,
      riot_valorant_level: 78
    }
  }
  return common
}

function filterByTitle(items: DemoItem[], title?: string): DemoItem[] {
  if (!title || typeof title !== 'string' || !title.trim()) return items
  const q = title.toLowerCase()
  return items.filter((i) => i.title.toLowerCase().includes(q))
}

export function mockForumProfile(): unknown {
  return {
    user: {
      user_id: DEMO_USER_ID,
      username: 'demo_seller',
      links: {
        avatar_small: 'https://ui-avatars.com/api/?name=demo_seller&background=1c6946&color=fff&size=128',
        permalink: `https://lolz.live/members/${DEMO_USER_ID}/`
      }
    }
  }
}

export function mockMarketFetch(
  path: string,
  options: {
    method?: string
    params?: Record<string, string | number | boolean | undefined>
    body?: unknown
  } = {}
): { status: number; data: unknown; headers: Record<string, string> } {
  const method = (options.method ?? 'GET').toUpperCase()
  const params = options.params ?? {}
  const headers = {
    'X-RateLimit-Limit': '300',
    'X-RateLimit-Remaining': '280',
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
  }

  if (path === '/me' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        user: { user_id: DEMO_USER_ID, username: 'demo_seller' },
        balance: { balance: 1_000_000.5, hold: 89_450.25 },
        items: { active: DEMO_MY_ITEMS.length, sold: 47 }
      }
    }
  }

  const userItemsMatch = path.match(/^\/user\/(\d+)\/items$/)
  if (userItemsMatch && method === 'GET') {
    const uid = Number(userItemsMatch[1])
    const pool = uid === DEMO_COMPETITOR_ID ? DEMO_COMPETITOR_ITEMS : DEMO_MY_ITEMS
    const filtered = filterByTitle(pool, params.title as string | undefined)
    return {
      status: 200,
      headers,
      data: { items: filtered, totalItems: filtered.length, page: 1, perPage: 40 }
    }
  }

  if (path === '/user/payments' && method === 'GET') {
    const now = Math.floor(Date.now() / 1000)
    return {
      status: 200,
      headers,
      data: {
        payments: [
          { payment_id: 90001, amount: 1450, type: 'sold_item', created_at: now - 86400, comment: 'Steam CS2' },
          { payment_id: 90002, amount: -890, type: 'paid_item', created_at: now - 86400 * 2, comment: 'Buy lot' },
          { payment_id: 90003, amount: 320, type: 'sold_item', created_at: now - 86400 * 3, comment: 'Telegram' },
          { payment_id: 90004, amount: -5000, type: 'withdrawal_balance', created_at: now - 86400 * 4, comment: 'SBP payout' },
          { payment_id: 90005, amount: -120, type: 'cost', created_at: now - 86400 * 6, comment: 'Commission' },
          { payment_id: 90006, amount: 780, type: 'income', created_at: now - 86400 * 8, comment: 'Valorant' },
          { payment_id: 90007, amount: 150, type: 'receiving_money', created_at: now - 86400 * 10, comment: 'Transfer in' },
          { payment_id: 90008, amount: -200, type: 'money_transfer', created_at: now - 86400 * 12, comment: 'Transfer out' }
        ]
      }
    }
  }

  if (path === '/currency' && method === 'GET') {
    const fmt = (rate: number) => `${rate.toLocaleString('ru-RU')} ₴`
    const cur = (title: string, rate: number, symbol: string) => ({
      title,
      rate,
      formattedRate: fmt(rate),
      symbol
    })
    return {
      status: 200,
      headers,
      data: {
        _hubDemo: true,
        lastUpdate: Math.floor(Date.now() / 1000),
        visitorCurrency: 'rub',
        currencyList: {
          BTC: cur('BTC', 2_800_708.88, 'BTC'),
          ETH: cur('ETH', 79_318.41, 'ETH'),
          BNB: cur('BNB', 25_626.95, 'BNB'),
          TON: cur('TON', 71.22, 'TON'),
          USDT: cur('USDT', 44.42, 'USDT'),
          USDC: cur('USDC', 44.54, 'USDC'),
          LTC: cur('LTC', 2_019.14, 'LTC'),
          SOL: cur('SOL', 3_656.35, 'SOL'),
          USD: cur('Доллар США', 44.42, '$'),
          EUR: cur('Евро', 50.97, '€'),
          GBP: cur('Британский фунт', 59.5, '£'),
          RUB: cur('Российский рубль', 0.5775, '₽'),
          UAH: cur('Украинская гривна', 1, '₴'),
          KZT: cur('Казахский тенге', 0.0942, 'KZT'),
          BYN: cur('Белорусский рубль', 15.35, 'BYN'),
          CNY: cur('Китайский юань', 6.57, 'CN¥')
        },
        system_info: { demo: true }
      }
    }
  }

  if (path === '/balance/exchange' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        balances: [
          { currency: 'rub', balance: 1_000_000.5, hold: 89_450.25 },
          { currency: 'usd', balance: 120.5, hold: 0 },
          { currency: 'eur', balance: 45.2, hold: 10 }
        ]
      }
    }
  }

  if (path === '/balance/exchange' && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Exchanged' } }
  }

  if (path === '/balance/transfer' && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Transfer sent' } }
  }

  if (path === '/balance/transfer/fee' && method === 'GET') {
    return { status: 200, headers, data: { fee: 15, amount: params.amount, currency: params.currency } }
  }

  if (path === '/balance/payout/services' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        services: [
          { service: 'SBP', title: 'SBP (RU)', min_amount: 100, max_amount: 50000 },
          { service: 'CryptoLove', title: 'Crypto TRX', min_amount: 500, max_amount: 100000 }
        ]
      }
    }
  }

  if (path === '/balance/payout' && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Payout requested' } }
  }

  if (path === '/auto-payments' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        auto_payments: [{ auto_payment_id: 1, username: 'buyer_demo', amount: 500, currency: 'rub', comment: 'Weekly' }]
      }
    }
  }

  if (path === '/auto-payment' && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok' } }
  }

  if (path === '/invoice/list' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        invoices: [
          { invoice_id: 501, payment_id: 'order-001', amount: 250, currency: 'rub', status: 'paid', comment: 'Design work' },
          { invoice_id: 502, payment_id: 'order-002', amount: 1500, currency: 'rub', status: 'pending', comment: 'Bulk deal' }
        ]
      }
    }
  }

  if (path === '/invoice' && method === 'POST') {
    const body = options.body as { amount?: number; payment_id?: string } | undefined
    return {
      status: 200,
      headers,
      data: {
        url: `https://lzt.market/invoice/demo/${body?.payment_id ?? 'new'}`,
        invoice: { invoice_id: 503, payment_id: body?.payment_id, amount: body?.amount, status: 'pending' }
      }
    }
  }

  if (path === '/cart' && method === 'GET') {
    const items = [...demoCartIds].map((id) => findDemoItem(id)).filter(Boolean)
    return { status: 200, headers, data: { items } }
  }

  if (path === '/cart' && method === 'POST') {
    const body = options.body as { item_id?: number } | undefined
    if (body?.item_id) demoCartIds.add(body.item_id)
    return { status: 200, headers, data: { success: true } }
  }

  if (path === '/cart' && method === 'DELETE') {
    const body = options.body as { item_id?: number } | undefined
    if (body?.item_id) demoCartIds.delete(body.item_id)
    else demoCartIds.clear()
    return { status: 200, headers, data: { success: true } }
  }

  if (path === '/fave' && method === 'GET') {
    const items = [...demoFavoriteIds].map((id) => findDemoItem(id)).filter(Boolean)
    return { status: 200, headers, data: { items } }
  }

  if (path === '/proxy' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        proxies: [
          { id: 1, host: '185.22.10.1', port: 8080 },
          { id: 2, host: '185.22.10.2', port: 8080 },
          { id: 3, host: '185.22.10.3', port: 8080 }
        ]
      }
    }
  }

  if (path === '/imap' && method === 'GET') {
    return {
      status: 200,
      headers,
      data: {
        imap: [
          { domain: 'mail.example.com', imap_server: 'imap.example.com', port: 993, secure: true },
          { domain: 'gmail.com', imap_server: 'imap.gmail.com', port: 993, secure: true }
        ]
      }
    }
  }

  if (path === '/imap' && method === 'DELETE') {
    return { status: 200, headers, data: { success: true } }
  }

  const itemMatch = path.match(/^\/(\d+)$/)
  if (itemMatch && method === 'GET') {
    const base = findDemoItem(Number(itemMatch[1]))
    if (!base) return { status: 404, headers, data: { error: 'Item not found' } }
    const item = buildDemoItemDetail(base)
    return {
      status: 200,
      headers,
      data: {
        item,
        canStickItem: true,
        canUnstickItem: false,
        canOpenItem: false,
        canCloseItem: true,
        canEditItem: true,
        canDeleteItem: true,
        canBumpItem: true,
        faveCount: 5,
        itemLink: `https://lzt.market/${base.item_id}/`,
        sameItemsCount: 2,
        sameItemsIds: [base.item_id + 1, base.item_id + 2]
      }
    }
  }

  const openMatch = path.match(/^\/(\d+)\/open$/)
  if (openMatch && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Opened' } }
  }

  const closeMatch = path.match(/^\/(\d+)\/close$/)
  if (closeMatch && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Closed' } }
  }

  if (itemMatch && method === 'DELETE') {
    return { status: 200, headers, data: { status: 'ok', message: 'Deleted' } }
  }

  if (path === '/user/tags' && method === 'GET') {
    return { status: 200, headers, data: { tags: DEMO_USER_TAGS } }
  }

  const tagAddMatch = path.match(/^\/(\d+)\/tag\/add$/)
  if (tagAddMatch && method === 'POST') {
    const itemId = Number(tagAddMatch[1])
    const tagId = Number(params.tag_id)
    const tag = DEMO_USER_TAGS.find((t) => t.tag_id === tagId)
    if (tag) {
      const current = getDemoItemTags(itemId)
      if (!current.some((t) => t.tag_id === tagId)) {
        setDemoItemTags(itemId, [...current, tag])
      }
    }
    return { status: 200, headers, data: { status: 'ok' } }
  }

  const tagDeleteMatch = path.match(/^\/(\d+)\/tag\/delete$/)
  if (tagDeleteMatch && method === 'POST') {
    const itemId = Number(tagDeleteMatch[1])
    const tagId = Number(params.tag_id)
    setDemoItemTags(
      itemId,
      getDemoItemTags(itemId).filter((t) => t.tag_id !== tagId)
    )
    return { status: 200, headers, data: { status: 'ok' } }
  }

  if (path === '/bulk/items' && method === 'POST') {
    const body = options.body as { item_id?: Array<number | { item_id: number }> } | undefined
    const ids = (body?.item_id ?? []).map((x) => (typeof x === 'number' ? x : x.item_id))
    const items = ids.map((id) => findDemoItem(id)).filter(Boolean)
    return { status: 200, headers, data: { items } }
  }

  if (path === '/email-code' && method === 'GET') {
    const itemId = Number(params.item_id)
    return { status: 200, headers, data: { code: `DEMO-${itemId}-42`, email_code: `DEMO-${itemId}-42` } }
  }

  const checkAccountMatch = path.match(/^\/(\d+)\/check-account$/)
  if (checkAccountMatch && method === 'POST') {
    return { status: 200, headers, data: { status: 'ok', message: 'Account is valid (demo)' } }
  }

  const starMatch = path.match(/^\/(\d+)\/star$/)
  if (starMatch && method === 'POST') {
    demoFavoriteIds.add(Number(starMatch[1]))
    return { status: 200, headers, data: { success: true } }
  }

  const categoryMatch = path.match(/^\/([a-z0-9-]+)$/)
  if (categoryMatch && method === 'GET' && !/^\d+$/.test(categoryMatch[1])) {
    const cat = categoryMatch[1]
    let items = DEMO_SEARCH_ITEMS.filter((i) => i.category === cat || cat === 'steam')
    if (params.pmax) items = items.filter((i) => i.price <= Number(params.pmax))
    if (params.pmin) items = items.filter((i) => i.price >= Number(params.pmin))
    return {
      status: 200,
      headers,
      data: { items, totalItems: items.length, page: 1, perPage: 40 }
    }
  }

  if (method === 'POST') {
    return { status: 200, headers, data: { success: true, item: { item_id: 100999 }, item_id: 100999 } }
  }

  if (method === 'PUT' || method === 'DELETE') {
    return { status: 200, headers, data: { success: true } }
  }

  return { status: 200, headers, data: {} }
}

function clearDemoTables(db: Database.Database): void {
  db.exec(`
    DELETE FROM deals;
    DELETE FROM activity_log;
    DELETE FROM upload_history;
    DELETE FROM watchlist;
    DELETE FROM watch_filters;
    DELETE FROM scheduled_tasks;
    DELETE FROM seen_listings;
    DELETE FROM listing_tracking;
  `)
}

export interface SeedResult {
  seeded: boolean
  message: string
  counts: Record<string, number>
}

export function seedDemoData(options: { replace?: boolean } = {}): SeedResult {
  const db = getDatabase()
  const existingDeals = (db.prepare('SELECT COUNT(*) as c FROM deals').get() as { c: number }).c

  if (!options.replace && existingDeals > 0) {
    return { seeded: false, message: 'already_has_data', counts: {} }
  }

  if (options.replace) {
    clearDemoTables(db)
  }

  const insertDeal = db.prepare(`
    INSERT INTO deals (item_id, category, action, buy_price, sell_price, margin, notes, transfer_to, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `)

  const deals: Array<[number, string, string, number, number, number, string | null, string | null, string]> = [
    [100201, 'steam', 'flip', 620, 890, 270, 'CS2 Prime flip', null, '-1 days'],
    [100203, 'telegram', 'flip', 180, 320, 140, 'Telegram premium', null, '-2 days'],
    [100204, 'discord', 'flip', 380, 540, 160, 'Nitro resell', null, '-3 days'],
    [100205, 'valorant', 'flip', 520, 780, 260, 'Skins bundle', null, '-4 days'],
    [100206, 'fortnite', 'flip', 410, 620, 210, 'Battle pass account', null, '-5 days'],
    [100207, 'steam', 'flip', 280, 410, 130, 'Rust hours', null, '-6 days'],
    [100208, 'telegram', 'flip', 95, 190, 95, 'Username account', null, '-7 days'],
    [100209, 'minecraft', 'flip', 220, 350, 130, 'Java+Bedrock', null, '-8 days'],
    [100210, 'steam', 'flip', 180, 280, 100, 'GTA modded', null, '-9 days'],
    [100211, 'discord', 'flip', 55, 95, 40, 'Aged discord', null, '-10 days'],
    [100212, 'roblox', 'flip', 290, 430, 140, 'Roblox premium', null, '-11 days'],
    [100202, 'steam', 'flip', 980, 1450, 470, 'Dota high MMR', null, '-12 days'],
    [100201, 'steam', 'transfer', 620, 890, 270, 'Transfer to buyer', 'market_buyer', '-13 days'],
    [100203, 'telegram', 'flip', 200, 320, 120, 'Repeat sale', null, '-14 days'],
    [100205, 'valorant', 'flip', 600, 780, 180, 'Quick flip', null, '-15 days']
  ]

  const seedDeals = db.transaction(() => {
    for (const row of deals) insertDeal.run(...row)
  })
  seedDeals()

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (module, action, details, created_at) VALUES (?, ?, ?, datetime('now', ?))
  `)
  const activities: Array<[string, string, string | null, string]> = [
    ['analytics', 'sync', null, '-1 hours'],
    ['upload', 'fast_sell', 'user_steam_042 → 100201', '-3 hours'],
    ['buyer', 'monitor_started', null, '-5 hours'],
    ['buyer', 'filter_saved', 'Steam deals', '-6 hours'],
    ['reseller', 'deal_added', 'steam +270₽', '-8 hours'],
    ['tools', 'telegram_configured', null, '-10 hours'],
    ['tools', 'proxy_upload', '3 proxies', '-12 hours'],
    ['automation', 'bulk_price', '5 items', '-1 days'],
    ['upload', 'fast_sell', 'tg_premium_01 → 100203', '-1 days'],
    ['buyer', 'fast_buy', '100001', '-2 days'],
    ['reseller', 'transfer', '100201 → market_buyer', '-2 days'],
    ['analytics', 'sync', null, '-3 days'],
    ['tools', 'imap_create', 'mail.example.com', '-4 days'],
    ['upload', 'bulk_upload', '3 accounts', '-5 days'],
    ['automation', 'auto_bump', '100202', '-6 days'],
    ['buyer', 'watchlist_add', '100004', '-7 days'],
    ['reseller', 'deal_added', 'discord +160₽', '-8 days'],
    ['settings', 'account_saved', 'demo_seller (demo)', '-9 days'],
    ['upload', 'fast_sell_failed', 'duplicate login', '-10 days'],
    ['tools', 'duplicate_check', 'user_steam_042', '-11 days']
  ]
  for (const row of activities) insertActivity.run(...row)

  const insertUpload = db.prepare(`
    INSERT INTO upload_history (login, item_id, category, status, message, initial_price, current_price, price_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', ?))
  `)
  const priceByItemId = Object.fromEntries(DEMO_MY_ITEMS.map((i) => [i.item_id, i.price]))
  const uploads: Array<[string, number | null, string, string, string | null, number | null, number | null, string]> = [
    ['user_steam_042', 100201, 'steam', 'success', 'Fast sell OK', priceByItemId[100201] ?? null, priceByItemId[100201] ?? null, '-1 days'],
    ['user_steam_042', null, 'steam', 'error', 'Duplicate login', null, null, '-2 days'],
    ['tg_premium_01', 100203, 'telegram', 'success', null, priceByItemId[100203] ?? null, priceByItemId[100203] ?? null, '-2 days'],
    ['discord_nitro_7', 100204, 'discord', 'success', null, priceByItemId[100204] ?? null, priceByItemId[100204] ?? null, '-3 days'],
    ['val_skins_12', 100205, 'valorant', 'success', null, priceByItemId[100205] ?? null, priceByItemId[100205] ?? null, '-4 days'],
    ['fortnite_og_3', 100206, 'fortnite', 'success', null, priceByItemId[100206] ?? null, priceByItemId[100206] ?? null, '-5 days'],
    ['rust_starter_9', 100207, 'steam', 'success', null, priceByItemId[100207] ?? null, priceByItemId[100207] ?? null, '-6 days'],
    ['tg_username_02', 100208, 'telegram', 'success', null, priceByItemId[100208] ?? null, priceByItemId[100208] ?? null, '-7 days'],
    ['mc_java_01', 100209, 'minecraft', 'success', null, priceByItemId[100209] ?? null, priceByItemId[100209] ?? null, '-8 days'],
    ['gta_mod_5', 100210, 'steam', 'success', null, priceByItemId[100210] ?? null, priceByItemId[100210] ?? null, '-9 days'],
    ['discord_aged_20', 100211, 'discord', 'success', null, priceByItemId[100211] ?? null, priceByItemId[100211] ?? null, '-10 days'],
    ['roblox_premium_1', 100212, 'roblox', 'success', null, priceByItemId[100212] ?? null, priceByItemId[100212] ?? null, '-11 days'],
    ['user_steam_099', null, 'steam', 'error', 'Invalid credentials', null, null, '-12 days'],
    ['dota_mmr_55', 100202, 'steam', 'success', null, priceByItemId[100202] ?? null, 1200, '-13 days'],
    ['tg_premium_01', null, 'telegram', 'error', 'Already uploaded', null, null, '-14 days']
  ]
  for (const row of uploads) insertUpload.run(...row)

  db.prepare(`
    INSERT INTO watchlist (item_id, title, price, target_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))
  `).run(100001, 'Steam | CS2 Prime | fresh', 450, 400, '-1 days')
  db.prepare(`
    INSERT INTO watchlist (item_id, title, price, target_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))
  `).run(100004, 'Telegram | session + 2FA', 85, 70, '-2 days')
  db.prepare(`
    INSERT INTO watchlist (item_id, title, price, target_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))
  `).run(100008, 'Fortnite | OG skins bundle', 890, 750, '-3 days')
  db.prepare(`
    INSERT INTO watchlist (item_id, title, price, target_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))
  `).run(200002, 'Competitor CS2 2000h', 1100, 950, '-4 days')
  db.prepare(`
    INSERT INTO watchlist (item_id, title, price, target_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))
  `).run(100010, 'Minecraft | Hypixel MVP+', 560, 480, '-5 days')

  db.prepare(`
    INSERT INTO watch_filters (name, category, params_json, is_enabled) VALUES (?, ?, ?, 1)
  `).run('Steam deals', 'steam', JSON.stringify({ pmax: 500, pmin: 100 }))
  db.prepare(`
    INSERT INTO watch_filters (name, category, params_json, is_enabled) VALUES (?, ?, ?, 1)
  `).run('Telegram cheap', 'telegram', JSON.stringify({ pmax: 200 }))
  db.prepare(`
    INSERT INTO watch_filters (name, category, params_json, is_enabled) VALUES (?, ?, ?, 0)
  `).run('Discord Nitro', 'discord', JSON.stringify({ pmax: 300 }))

  db.prepare(`
    INSERT INTO scheduled_tasks (name, type, config_json, interval_minutes, is_enabled, last_run_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', '-2 hours'))
  `).run('Auto-bump CS2 lots', 'auto_bump', JSON.stringify({ item_ids: [100201, 100202], hour: 8 }), 360)
  db.prepare(`
    INSERT INTO scheduled_tasks (name, type, config_json, interval_minutes, is_enabled, last_run_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', '-1 days'))
  `).run('Bulk price -5%', 'bulk_price', JSON.stringify({ item_ids: [100203, 100204], percent: -5 }), 1440)
  db.prepare(`
    INSERT INTO scheduled_tasks (name, type, config_json, interval_minutes, is_enabled, last_run_at)
    VALUES (?, ?, ?, ?, 0, NULL)
  `).run('Night reprice', 'bulk_price', JSON.stringify({ item_ids: [100205], percent: 10 }), 720)
  db.prepare(`
    INSERT INTO scheduled_tasks (name, type, config_json, interval_minutes, is_enabled, last_run_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', '-30 minutes'))
  `).run('Monitor sync', 'monitor', JSON.stringify({}), 15)

  for (const id of [100001, 100002, 100003, 100004, 100005, 100006, 100007, 100008, 200001, 200002]) {
    db.prepare(`INSERT INTO seen_listings (item_id, seen_at) VALUES (?, datetime('now', ?))`).run(
      id,
      `-${id % 10} hours`
    )
  }

  for (const item of DEMO_MY_ITEMS.slice(0, 8)) {
    db.prepare(`
      INSERT INTO listing_tracking (item_id, price, title, category, listed_at) VALUES (?, ?, ?, ?, datetime('now', ?))
    `).run(item.item_id, item.price, item.title, item.category ?? 'other', `-${item.item_id % 7} days`)
  }

  db.prepare(`
    INSERT OR IGNORE INTO competitor_watchlist (user_id, label, is_enabled, listing_count, last_sync_at)
    VALUES (?, ?, 1, ?, datetime('now'))
  `).run(String(DEMO_COMPETITOR_ID), 'Demo конкурент', DEMO_COMPETITOR_ITEMS.length)

  for (const item of DEMO_COMPETITOR_ITEMS) {
    db.prepare(`
      INSERT INTO competitor_prices (user_id, category, item_id, title, price, captured_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, item_id) DO UPDATE SET price = excluded.price, title = excluded.title
    `).run(String(DEMO_COMPETITOR_ID), item.category ?? 'other', item.item_id, item.title, item.price)
  }

  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
  upsertSetting.run('telegram_bot_token', '123456789:AAHdemo-token-for-dev-only')
  upsertSetting.run('telegram_chat_id', '-1001234567890')
  upsertSetting.run('market_secret_answer', 'demo-secret')
  upsertSetting.run('notify_desktop', '1')
  upsertSetting.run('monitor_interval_seconds', '5')
  upsertSetting.run('analytics_last_competitor_id', String(DEMO_COMPETITOR_ID))
  upsertSetting.run('competitor_user_id', String(DEMO_COMPETITOR_ID))
  upsertSetting.run('demo_data_seeded', new Date().toISOString())

  db.prepare('DELETE FROM accounts').run()
  db.prepare('INSERT INTO accounts (name, token, is_active) VALUES (?, ?, 1)').run(
    'demo_seller (demo)',
    DEMO_TOKEN
  )

  demoCartIds = new Set([100001, 100004])
  demoFavoriteIds = new Set([100003])

  recomputeMatchesForCompetitor(String(DEMO_COMPETITOR_ID))

  const counts = {
    deals: (db.prepare('SELECT COUNT(*) as c FROM deals').get() as { c: number }).c,
    activity: (db.prepare('SELECT COUNT(*) as c FROM activity_log').get() as { c: number }).c,
    uploads: (db.prepare('SELECT COUNT(*) as c FROM upload_history').get() as { c: number }).c,
    watchlist: (db.prepare('SELECT COUNT(*) as c FROM watchlist').get() as { c: number }).c,
    filters: (db.prepare('SELECT COUNT(*) as c FROM watch_filters').get() as { c: number }).c,
    tasks: (db.prepare('SELECT COUNT(*) as c FROM scheduled_tasks').get() as { c: number }).c
  }

  return { seeded: true, message: 'ok', counts }
}

export function seedDemoDataIfNeeded(): SeedResult {
  const db = getDatabase()
  const deals = (db.prepare('SELECT COUNT(*) as c FROM deals').get() as { c: number }).c
  const uploads = (db.prepare('SELECT COUNT(*) as c FROM upload_history').get() as { c: number }).c
  if (deals === 0 && uploads === 0) {
    return seedDemoData({ replace: true })
  }
  return { seeded: false, message: 'skipped', counts: {} }
}
