import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export type DashboardWidgetId =
  | 'finance_balance'
  | 'reseller_margin'
  | 'upload_success'
  | 'buyer_autobuy'
  | 'finance_hold'
  | 'buyer_monitor'
  | 'automation_pipeline'
  | 'chart_margin_category'
  | 'chart_margin_timeline'
  | 'chart_upload_timeline'
  | 'alert_monitor'
  | 'alert_hold'
  | 'alert_upload'

export type AnalyticsSectionId =
  | 'reseller_deals'
  | 'reseller_charts'
  | 'finance_balance'
  | 'finance_payments'
  | 'buyer_competitors'
  | 'upload_listings'

export interface ModuleManifest {

  id?: string

  path: string

  optional?: boolean
  defaultEnabled?: boolean
  order?: number
  icon: LucideIcon

  navKey: string

  descKey?: string

  end?: boolean
  dashboardWidgets?: DashboardWidgetId[]
  analyticsSections?: AnalyticsSectionId[]
  loadPage: () => Promise<{ default: ComponentType }>
}

export interface LoadedModule extends ModuleManifest {
  id: string
  folder: string
}

export interface ModuleBridgeDefinition {
  id: string
  requires: string[]
  descKey: string
}

export interface ModuleLoaderStep {
  statusKey: string
  detailKey: string

  weight?: number
}

export interface ModuleLoaderContribution {
  steps?: ModuleLoaderStep[]

  prepare?: () => Promise<void>
}
