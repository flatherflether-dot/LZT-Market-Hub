import { en, type TranslationKey } from './i18n'
import { getActivityModuleOrder } from './module-loader'

const ACTIVITY_MODULE_KEYS: Record<string, TranslationKey> = {
  analytics: 'nav.analytics',
  automation: 'nav.automation',
  buyer: 'nav.buyer',
  dashboard: 'nav.dashboard',
  finance: 'nav.finance',
  reseller: 'nav.reseller',
  settings: 'nav.settings',
  tools: 'nav.tools',
  upload: 'nav.upload'
}

const ACTIVITY_ACTION_KEYS: Record<string, TranslationKey> = {
  sync: 'activity.action.sync',
  fast_sell: 'activity.action.fast_sell',
  monitor_started: 'activity.action.monitor_started',
  filter_saved: 'activity.action.filter_saved',
  deal_added: 'activity.action.deal_added',
  telegram_configured: 'activity.action.telegram_configured',
  proxy_upload: 'activity.action.proxy_upload',
  bulk_price: 'activity.action.bulk_price',
  fast_buy: 'activity.action.fast_buy',
  transfer: 'activity.action.transfer',
  imap_create: 'activity.action.imap_create',
  bulk_upload: 'activity.action.bulk_upload',
  auto_bump: 'activity.action.auto_bump',
  watchlist_add: 'activity.action.watchlist_add',
  account_saved: 'activity.action.account_saved',
  fast_sell_failed: 'activity.action.fast_sell_failed',
  duplicate_check: 'activity.action.duplicate_check',
  refuse_guarantee: 'activity.action.refuse_guarantee',
  task_created: 'activity.action.task_created',
  bulk_action: 'activity.action.bulk_action',
  queue_parsed: 'activity.action.queue_parsed',
  batch_complete: 'activity.action.batch_complete',
  account_added: 'activity.action.account_added',
  logout: 'activity.action.logout',
  monitor: 'activity.action.monitor',
  task_failed: 'activity.action.task_failed',
  rule_matched: 'activity.action.rule_matched',
  autobuy: 'activity.action.autobuy'
}

export const ACTIVITY_MODULE_ORDER = getActivityModuleOrder()

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

function resolveKey(key: TranslationKey): boolean {
  return key in en
}

export function formatActivityModule(t: TranslateFn, module: string): string {
  const key = ACTIVITY_MODULE_KEYS[module]
  return key ? t(key) : module
}

export function formatActivityAction(t: TranslateFn, action: string): string {
  const actionKey = ACTIVITY_ACTION_KEYS[action]
  if (actionKey) return t(actionKey)

  const taskKey = `automation.task.${action}` as TranslationKey
  if (resolveKey(taskKey)) return t(taskKey)

  return action.replace(/_/g, ' ')
}

export function sortActivityModules(modules: string[]): string[] {
  const order = ACTIVITY_MODULE_ORDER as readonly string[]
  return [...modules].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
