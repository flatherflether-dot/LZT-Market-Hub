import type { LucideIcon } from 'lucide-react'
import { Activity, Eye, HardDrive, Mail, Send } from 'lucide-react'
import type { TranslationKey } from '@core/i18n'

export interface ToolsStatusItem {
  key: string
  icon: LucideIcon
  label: string
  value: string
  hint: string
  ok: boolean
  href?: string
}

export interface ToolsStatusDataProps {
  telegramConfigured: boolean
  imapCount: number
  uploadEnabled: boolean
  activityCount: number
  uploadHistoryCount: number
  buyerEnabled: boolean
  seenListingsCount: number
}

export function buildToolsStatusItems(
  props: ToolsStatusDataProps,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): ToolsStatusItem[] {
  return [
    {
      key: 'telegram',
      icon: Send,
      label: 'Telegram',
      value: props.telegramConfigured ? t('tools.telegramConfigured') : t('tools.telegramNotConfigured'),
      hint: props.telegramConfigured
        ? t('dashboard.integrationHintTelegramOk')
        : t('dashboard.integrationHintTelegramOff'),
      ok: props.telegramConfigured,
      href: '/tools?tab=integrations'
    },
    ...(props.uploadEnabled
      ? [
          {
            key: 'imap',
            icon: Mail,
            label: t('tools.imapTitle'),
            value: String(props.imapCount),
            hint: t('dashboard.integrationHintImap', { count: props.imapCount }),
            ok: props.imapCount > 0,
            href: '/tools?tab=integrations'
          }
        ]
      : []),
    {
      key: 'activity',
      icon: Activity,
      label: t('tools.activityLog'),
      value: String(props.activityCount),
      hint: t('dashboard.integrationHintActivity', { count: props.activityCount }),
      ok: props.activityCount > 0,
      href: '/tools?tab=activity'
    },
    ...(props.uploadEnabled
      ? [
          {
            key: 'upload',
            icon: HardDrive,
            label: t('tools.uploadHistoryCount'),
            value: String(props.uploadHistoryCount),
            hint: t('dashboard.integrationHintUpload', { count: props.uploadHistoryCount }),
            ok: props.uploadHistoryCount > 0,
            href: '/upload?tab=accounts'
          }
        ]
      : []),
    ...(props.buyerEnabled
      ? [
          {
            key: 'seen',
            icon: Eye,
            label: t('tools.seenListingsCount'),
            value: String(props.seenListingsCount),
            hint: t('dashboard.integrationHintSeen', { count: props.seenListingsCount }),
            ok: props.seenListingsCount > 0,
            href: '/tools?tab=utilities'
          }
        ]
      : [])
  ]
}
