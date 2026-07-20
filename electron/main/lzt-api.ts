const API_BASE = 'https://prod-api.lzt.market'
const FORUM_API_BASE = 'https://prod-api.lzt.live'

export interface MarketFetchResult {
  status: number
  data: unknown
  headers: Record<string, string>
}

export async function lztMarketFetch(
  token: string,
  path: string,
  options: {
    method?: string
    body?: unknown
    params?: Record<string, string | number | boolean | undefined>
  } = {}
): Promise<MarketFetchResult> {
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(300_000)
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  const headers: Record<string, string> = {}
  for (const key of ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']) {
    const val = response.headers.get(key)
    if (val) headers[key] = val
  }

  return { status: response.status, data, headers }
}

export async function forumGetMe(token: string): Promise<unknown> {
  const response = await fetch(`${FORUM_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(30_000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export async function forumFindUser(
  token: string,
  username: string
): Promise<{ user?: { user_id: number; username: string } }> {
  const url = new URL(`${FORUM_API_BASE}/users/find`)
  url.searchParams.set('username', username.trim())
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(30_000)
  })
  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  if (!response.ok) {
    const err = (json as { error?: string; message?: string })?.error ?? (json as { message?: string })?.message
    throw new Error(err || `HTTP ${response.status}`)
  }
  return json as { user?: { user_id: number; username: string } }
}

export async function lztRequest<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | number> } = {}
): Promise<T> {
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, String(v))
    }
  }

  let retries = 100
  while (retries > 0) {
    const response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(300_000)
    })

    let json: unknown = null
    try {
      json = await response.json()
    } catch {
      json = null
    }

    const errors = (json as { errors?: string[] })?.errors ?? []
    if (errors.some((e) => e.includes('retry_request')) && retries > 1) {
      retries--
      await sleep(2000)
      continue
    }

    if (!response.ok) {
      throw new Error(errors.join(', ') || `HTTP ${response.status}`)
    }

    return json as T
  }

  throw new Error('Max retries exceeded')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Telegram error: ${body}`)
  }
}
