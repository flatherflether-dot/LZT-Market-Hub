import { getDatabase } from './database'

export interface RuleConditions {
  category?: string
  pmax?: number
  pmin?: number
  title_contains?: string
  title_excludes?: string
}

export interface RuleActions {
  telegram?: boolean
  watchlist?: boolean
  autobuy?: boolean
  desktop_notify?: boolean
}

export interface MonitorRule {
  id: number
  name: string
  category: string | null
  conditions_json: string
  actions_json: string
  is_enabled: number
  priority: number
}

export interface MarketListing {
  item_id: number
  title: string
  price: number
  category?: string
  seller?: { username?: string }
}

export function getEnabledRules(): MonitorRule[] {
  return getDatabase()
    .prepare('SELECT * FROM monitor_rules WHERE is_enabled = 1 ORDER BY priority DESC, id ASC')
    .all() as MonitorRule[]
}

function matchesConditions(item: MarketListing, filterCategory: string, conditions: RuleConditions): boolean {
  if (conditions.category && filterCategory !== conditions.category) return false
  if (conditions.pmax !== undefined && item.price > conditions.pmax) return false
  if (conditions.pmin !== undefined && item.price < conditions.pmin) return false
  const title = item.title.toLowerCase()
  if (conditions.title_contains && !title.includes(conditions.title_contains.toLowerCase())) return false
  if (conditions.title_excludes && title.includes(conditions.title_excludes.toLowerCase())) return false
  return true
}

export function evaluateRules(
  item: MarketListing,
  filterCategory: string
): Array<{ rule: MonitorRule; conditions: RuleConditions; actions: RuleActions }> {
  const matched: Array<{ rule: MonitorRule; conditions: RuleConditions; actions: RuleActions }> = []
  for (const rule of getEnabledRules()) {
    const conditions = JSON.parse(rule.conditions_json) as RuleConditions
    const actions = JSON.parse(rule.actions_json) as RuleActions
    const category = conditions.category ?? rule.category ?? filterCategory
    if (!matchesConditions(item, filterCategory, { ...conditions, category })) continue
    matched.push({ rule, conditions, actions })
  }
  return matched
}

export function isBlacklisted(item: MarketListing): boolean {
  const db = getDatabase()
  const keywords = db
    .prepare("SELECT value FROM buyer_blacklist WHERE type = 'keyword'")
    .all() as Array<{ value: string }>
  const title = item.title.toLowerCase()
  if (keywords.some((k) => title.includes(k.value.toLowerCase()))) return true

  const seller = item.seller?.username
  if (seller) {
    const blocked = db
      .prepare("SELECT 1 FROM buyer_blacklist WHERE type = 'seller' AND value = ? LIMIT 1")
      .get(seller)
    if (blocked) return true
  }
  return false
}
