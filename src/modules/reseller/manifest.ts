import { RefreshCw } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/reseller',
  optional: true,
  defaultEnabled: true,
  order: 2,
  icon: RefreshCw,
  navKey: 'nav.reseller',
  descKey: 'modules.resellerDesc',
  dashboardWidgets: ['reseller_margin', 'chart_margin_category', 'chart_margin_timeline'],
  analyticsSections: ['reseller_deals', 'reseller_charts'],
  loadPage: () => import('./ResellerPage').then((m) => ({ default: m.ResellerPage }))
} satisfies ModuleManifest
