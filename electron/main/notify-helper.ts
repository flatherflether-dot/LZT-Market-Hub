import { getSetting } from './database'
import { sendTelegram } from './lzt-api'
import { fireWebhook, type WebhookEvent } from './webhook-helper'

export type NotifyKind = 'new_listing' | 'price_alert' | 'autobuy' | 'task_failed' | 'claim' | 'generic'

const DEFAULT_TEMPLATES: Record<NotifyKind, string> = {
  new_listing: '🔔 <b>{title}</b>\n{body}\n{url}',
  price_alert: '📉 <b>Price alert</b>\n{body}\n{url}',
  autobuy: '✅ <b>Auto-buy</b>\n{body}\n{url}',
  task_failed: '❌ <b>Task failed</b>\n{body}',
  claim: '⚠️ <b>Claim</b>\n{body}\n{url}',
  generic: '📢 <b>{title}</b>\n{body}'
}

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  )
}

export async function notifyTelegramKind(
  kind: NotifyKind,
  vars: { title?: string; body: string; url?: string }
): Promise<void> {
  const botToken = getSetting('telegram_bot_token')
  const chatId = getSetting('telegram_chat_id')
  if (!botToken || !chatId) return

  const settingKey = `telegram_tpl_${kind}` as const
  const custom = getSetting(settingKey)
  const template = custom?.trim() || DEFAULT_TEMPLATES[kind]
  const text = interpolate(template, {
    title: vars.title ?? '',
    body: vars.body,
    url: vars.url ?? ''
  })

  try {
    await sendTelegram(botToken, chatId, text)
  } catch {

  }
}

const WEBHOOK_KIND_MAP: Partial<Record<NotifyKind, WebhookEvent>> = {
  new_listing: 'new_listing',
  price_alert: 'price_alert',
  autobuy: 'autobuy',
  task_failed: 'task_failed',
  claim: 'claim'
}

export function notifyAll(
  kind: NotifyKind,
  title: string,
  body: string,
  options?: { subtitle?: string; url?: string; module?: string; action?: string; params?: Record<string, string> }
): void {
  void notifyTelegramKind(kind, { title, body, url: options?.url })
  const webhookEvent = WEBHOOK_KIND_MAP[kind]
  if (webhookEvent) {
    void fireWebhook(webhookEvent, { title, body, subtitle: options?.subtitle, url: options?.url })
  }
}
