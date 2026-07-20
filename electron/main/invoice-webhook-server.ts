import http from 'http'
import { timingSafeEqual } from 'crypto'
import { getDatabase, getSetting } from './database'
import { insertAutoDeal } from './deal-helper'
import { notifyAll } from './notify-helper'
import { fireWebhook } from './webhook-helper'

const MAX_BODY_BYTES = 256 * 1024

let server: http.Server | null = null

function webhookPath(): string {
  const raw = getSetting('invoice_webhook_path') || '/invoice/callback'
  return raw.startsWith('/') ? raw : `/${raw}`
}

function webhookPort(): number {
  return Number(getSetting('invoice_webhook_port') || 8765)
}

export function getInvoiceWebhookPublicUrl(): string {
  return `http://127.0.0.1:${webhookPort()}${webhookPath()}`
}

export function isInvoiceWebhookRunning(): boolean {
  return server !== null
}

function extractAmount(data: Record<string, unknown>): number {
  const raw = data.amount ?? data.paid_amount ?? data.sum ?? data.payment_amount
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function extractComment(data: Record<string, unknown>): string {
  const parts = [data.comment, data.payment_id, data.invoice_id, data.status].filter(Boolean)
  return parts.map(String).join(' · ') || 'invoice payment'
}

function handleInvoicePayload(data: Record<string, unknown>): void {
  const db = getDatabase()
  const paymentKey = String(data.payment_id ?? data.invoice_id ?? '') || null

  if (paymentKey && getSetting('invoice_webhook_dedupe') !== '0') {
    const dup = db.prepare('SELECT 1 FROM invoice_webhook_log WHERE payment_key = ?').get(paymentKey)
    if (dup) return
  }

  db.prepare('INSERT INTO invoice_webhook_log (payload_json, payment_key) VALUES (?, ?)').run(
    JSON.stringify(data),
    paymentKey
  )
  const status = String(data.status ?? data.state ?? 'paid').toLowerCase()
  const isPaid = status.includes('paid') || status === 'ok' || status === 'success' || data.paid === true
  const amount = extractAmount(data)
  const comment = extractComment(data)

  if (!isPaid) return

  notifyAll('generic', 'Invoice paid', `${amount > 0 ? `${amount} ₽ — ` : ''}${comment}`, { url: undefined })

  void fireWebhook('invoice_paid', {
    amount,
    comment,
    payment_id: data.payment_id,
    invoice_id: data.invoice_id,
    status,
    raw: data
  })

  if (
    getSetting('invoice_webhook_auto_deal') === '1' &&
    amount > 0
  ) {
    insertAutoDeal({
      action: 'sell',
      sell_price: amount,
      notes: comment,
      source: 'invoice',
      requireBridge: ['finance', 'reseller']
    })
    db.prepare('INSERT INTO activity_log (module, action, details) VALUES (?, ?, ?)').run(
      'finance',
      'invoice_deal',
      comment
    )
  }
}

export function startInvoiceWebhookServer(): void {
  if (server) return
  const port = webhookPort()
  const path = webhookPath()

  server = http.createServer((req, res) => {
    const reqPath = (req.url ?? '').split('?')[0]
    if (req.method === 'GET' && reqPath === path) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'lzt-market-hub-invoice-webhook' }))
      return
    }

    if (req.method !== 'POST' || reqPath !== path) {
      res.writeHead(404)
      res.end()
      return
    }

    const secret = getSetting('invoice_webhook_secret')?.trim()
    if (secret) {
      const header = req.headers['x-webhook-secret'] ?? req.headers['authorization']
      const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : ''
      const a = Buffer.from(token)
      const b = Buffer.from(secret)
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        res.writeHead(401)
        res.end('unauthorized')
        return
      }
    }

    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        res.writeHead(413)
        res.end('payload too large')
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (res.writableEnded) return
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        let data: Record<string, unknown> = {}
        if (raw.trim()) {
          const parsed = JSON.parse(raw) as unknown
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            data = parsed as Record<string, unknown>
          } else {
            data = { raw }
          }
        }
        handleInvoicePayload(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
      } catch {
        res.writeHead(400)
        res.end('bad request')
      }
    })
  })

  server.on('error', (err) => {
    console.error('Invoice webhook server error:', err)
  })

  server.listen(port, '127.0.0.1')
}

export function stopInvoiceWebhookServer(): void {
  if (!server) return
  server.close()
  server = null
}

export function restartInvoiceWebhookServer(): void {
  stopInvoiceWebhookServer()
  if (getSetting('invoice_webhook_enabled') === '1') {
    startInvoiceWebhookServer()
  }
}

export function getInvoiceWebhookLogs(limit = 50): Array<{
  id: number
  payload_json: string
  payment_key: string | null
  created_at: string
}> {
  return getDatabase()
    .prepare('SELECT id, payload_json, payment_key, created_at FROM invoice_webhook_log ORDER BY id DESC LIMIT ?')
    .all(limit) as Array<{
    id: number
    payload_json: string
    payment_key: string | null
    created_at: string
  }>
}

export async function testInvoiceWebhookLocally(): Promise<void> {
  const url = getInvoiceWebhookPublicUrl()
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'paid',
      amount: 250,
      payment_id: `test-${Date.now()}`,
      comment: 'Hub test invoice callback'
    })
  })
}

export function initInvoiceWebhookFromSettings(): void {
  if (getSetting('invoice_webhook_enabled') === '1') {
    startInvoiceWebhookServer()
  }
}
