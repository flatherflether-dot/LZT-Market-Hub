import type { Locale } from './i18n/index'

type MessageMap = Record<string, string>

const enModules = import.meta.glob<{ default: MessageMap; en?: MessageMap }>(
  '../modules/*/i18n/en.ts',
  { eager: true }
)
const ruModules = import.meta.glob<{ default: MessageMap; ru?: MessageMap }>(
  '../modules/*/i18n/ru.ts',
  { eager: true }
)

function folderFromPath(globPath: string): string {
  return globPath.match(/\/modules\/([^/]+)\//)?.[1] ?? 'unknown'
}

function extractMessages(mod: { default?: MessageMap; en?: MessageMap; ru?: MessageMap }, locale: Locale): MessageMap {
  if (locale === 'en') return mod.default ?? mod.en ?? {}
  return mod.default ?? mod.ru ?? {}
}

function mergeModuleMessages(locale: Locale): MessageMap {
  const merged: MessageMap = {}
  const sources = locale === 'en' ? enModules : ruModules
  for (const [path, mod] of Object.entries(sources)) {
    if (folderFromPath(path).startsWith('_')) continue
    Object.assign(merged, extractMessages(mod, locale))
  }
  return merged
}

export const moduleMessagesEn = mergeModuleMessages('en')
export const moduleMessagesRu = mergeModuleMessages('ru')
