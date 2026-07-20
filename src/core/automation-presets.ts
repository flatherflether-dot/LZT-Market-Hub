export interface AutomationPreset {
  id: string
  nameKey: string
  type: string
  config: Record<string, unknown>
  intervalMinutes: number
}

export const AUTOMATION_PRESETS: AutomationPreset[] = [
  {
    id: 'cs2_flipper',
    nameKey: 'automation.preset.cs2Flipper',
    type: 'auto_bump_single',
    config: { hour: 8 },
    intervalMinutes: 360
  },
  {
    id: 'stale_reprice_7d',
    nameKey: 'automation.preset.staleReprice7d',
    type: 'smart_reprice_stale',
    config: {
      days_without_sale: 7,
      min_margin_percent: 10,
      respect_buy_price: true,
      use_category_median: true,
      drop_percent_fallback: 5
    },
    intervalMinutes: 1440
  },
  {
    id: 'smart_reprice_aggressive',
    nameKey: 'automation.preset.smartRepriceAggressive',
    type: 'smart_reprice_stale',
    config: {
      days_without_sale: 3,
      min_margin_percent: 5,
      respect_buy_price: true,
      use_category_median: true,
      drop_percent_fallback: 8
    },
    intervalMinutes: 720
  },
  {
    id: 'competitor_sync',
    nameKey: 'automation.preset.competitorSync',
    type: 'sync_competitor_listings',
    config: { min_match_score: 0.52 },
    intervalMinutes: 30
  },
  {
    id: 'competitor_undercut',
    nameKey: 'automation.preset.competitorUndercut',
    type: 'competitor_undercut_reprice',
    config: {
      undercut_rub: 1,
      min_margin_percent: 10,
      respect_buy_price: true,
      min_match_score: 0.52,
      competitor_user_ids: []
    },
    intervalMinutes: 60
  }
]

export function getNextRunAt(task: {
  interval_minutes: number
  last_run_at: string | null
  created_at: string
}): Date {
  const base = task.last_run_at ? new Date(task.last_run_at) : new Date(task.created_at)
  return new Date(base.getTime() + task.interval_minutes * 60_000)
}
