let apiLocale: 'ru' | 'en' = 'en'

export function setApiLocale(locale: 'ru' | 'en'): void {
  apiLocale = locale
}

export function getApiLocale(): 'ru' | 'en' {
  return apiLocale
}

export function withApiLocale<T extends Record<string, string | number | boolean | undefined>>(
  params?: T
): T & { locale: 'ru' | 'en' } {
  return { ...(params ?? ({} as T)), locale: apiLocale }
}
