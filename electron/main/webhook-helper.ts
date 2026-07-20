import { getSetting } from './database'

export type WebhookEvent =
  | 'new_listing'
  | 'price_alert'
  | 'autobuy'
  | 'deal'
  | 'task_failed'
  | 'competitor_undercut'
  | 'upload_complete'
  | 'claim'
  | 'invoice_paid'

const ALL_EVENTS: WebhookEvent[] = [
  'new_listing',
  'price_alert',
  'autobuy',
  'deal',
  'task_failed',
  'competitor_undercut',
  'upload_complete',
  'claim',
  'invoice_paid'
]

function enabledEvents(): Set<WebhookEvent> {
  const raw = getSetting('webhook_events')
  if (!raw?.trim()) return new Set(ALL_EVENTS)
  try {
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed.filter((e): e is WebhookEvent => ALL_EVENTS.includes(e as WebhookEvent)))
  } catch {
    return new Set(ALL_EVENTS)
  }
}

export async function fireWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  if (getSetting('webhook_enabled') !== '1') return
  const url = getSetting('webhook_url')?.trim()
  if (!url) return
  if (!enabledEvents().has(event)) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'LZT-Market-Hub/1.1' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload
      }),
      signal: AbortSignal.timeout(8000)
    })
  } catch {

  }
}

export { ALL_EVENTS as WEBHOOK_EVENTS }
