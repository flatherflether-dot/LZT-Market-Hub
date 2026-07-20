import { useCallback } from 'react'
import { create } from 'zustand'
import { en } from './en'
import { ru } from './ru'
import { setApiLocale } from '@core/api-locale'

import { ITEM_ORIGINS, MARKET_CATEGORIES } from '@core/constants'

export type Locale = 'en' | 'ru'

export type TranslationKey = keyof typeof en

const messages: Record<Locale, Record<TranslationKey, string>> = { en, ru }

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text
  )
}

interface LocaleState {
  locale: Locale
  hydrated: boolean
  hydrate: () => Promise<void>
  setLocale: (locale: Locale) => Promise<void>
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  hydrated: false,

  hydrate: async () => {
    const saved = await window.api.db.getSetting('locale')
    const locale: Locale = saved === 'ru' ? 'ru' : 'en'
    document.documentElement.lang = locale
    setApiLocale(locale)
    set({ locale, hydrated: true })
  },

  setLocale: async (locale) => {
    await window.api.db.setSetting('locale', locale)
    document.documentElement.lang = locale
    setApiLocale(locale)
    set({ locale })
  }
}))

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const text = messages[locale][key] ?? messages.en[key] ?? key
  return interpolate(text, params)
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  )

  return { t, locale, setLocale }
}

export function useCategoryOptions() {
  return MARKET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))
}

export function useOriginOptions() {
  const { t } = useTranslation()
  return ITEM_ORIGINS.map((o) => ({
    value: o.value,
    label: t(`origin.${o.value}` as TranslationKey)
  }))
}

export function useTaskTypeOptions() {
  const { t } = useTranslation()
  const types = [
    'auto_bump_single',
    'bulk_bump',
    'bulk_close',
    'bulk_open',
    'auto_reprice',
    'auto_reprice_stale',
    'smart_reprice_stale',
    'sync_competitor_listings',
    'competitor_undercut_reprice'
  ] as const
  return types.map((value) => ({
    value,
    label: t(`automation.task.${value}` as TranslationKey)
  }))
}

export { en, ru }
