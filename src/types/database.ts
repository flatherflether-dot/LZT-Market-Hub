export interface ActivityLogEntry {
  id: number
  module: string
  action: string
  details: string | null
  created_at: string
}

export interface WatchFilter {
  id: number
  name: string
  category: string
  params_json: string
  is_enabled: number
  created_at: string
}

export interface WatchFilterInput {
  id?: number
  name: string
  category: string
  params_json: string
  is_enabled: number
}

export interface Deal {
  id: number
  item_id: number | null
  category: string | null
  action: string
  buy_price: number | null
  sell_price: number | null
  margin: number | null
  notes: string | null
  transfer_to: string | null
  source: string | null
  parent_deal_id: number | null
  created_at: string
}

export interface DealInput {
  item_id?: number
  category?: string
  action: string
  buy_price?: number
  sell_price?: number
  margin?: number
  notes?: string
  transfer_to?: string
  source?: string
  parent_deal_id?: number
}

export interface ScheduledTask {
  id: number
  name: string
  type: string
  config_json: string
  interval_minutes: number
  is_enabled: number
  last_run_at: string | null
  last_error: string | null
  created_at: string
}

export interface ScheduledTaskInput {
  id?: number
  name: string
  type: string
  config_json: string
  interval_minutes: number
  is_enabled: number
}

export interface WatchlistItem {
  id: number
  item_id: number
  title: string | null
  price: number | null
  target_price: number | null
  created_at: string
}

export interface UploadHistoryEntry {
  id: number
  login: string
  item_id: number | null
  category: string | null
  status: string
  message: string | null
  initial_price: number | null
  current_price: number | null
  price_updated_at: string | null
  created_at: string
}

export interface MonitorRule {
  id: number
  name: string
  category: string | null
  conditions_json: string
  actions_json: string
  is_enabled: number
  priority: number
  created_at: string
}

export interface MonitorRuleInput {
  id?: number
  name: string
  category?: string | null
  conditions_json: string
  actions_json: string
  is_enabled: number
  priority?: number
}

export interface BlacklistEntry {
  id: number
  type: string
  value: string
  created_at: string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  bucket?: string
}

export interface DashboardStats {
  dealsCount: number
  totalMargin: number
  watchFilters: number
  watchlistCount: number
  uploadHistory: number
  tasksCount: number
  monitorRunning: boolean
}

export interface ImapConfigEntry {
  domain: string
  imap_host: string
  imap_port: number
  imap_ssl: number
  updated_at: string
}

export interface CompetitorWatchEntry {
  id: number
  user_id: string
  label: string | null
  username: string | null
  is_enabled: number
  last_sync_at: string | null
  listing_count: number
  created_at: string
}

export interface StoredCompetitorListing {
  user_id: string
  category: string
  item_id: number
  title: string | null
  price: number
  captured_at: string
}

export interface StoredListingMatch {
  our_item_id: number
  competitor_user_id: string
  competitor_item_id: number
  match_score: number
  our_title: string | null
  our_price: number | null
  our_category: string | null
  competitor_title: string | null
  competitor_price: number | null
  competitor_category: string | null
  updated_at: string
}
