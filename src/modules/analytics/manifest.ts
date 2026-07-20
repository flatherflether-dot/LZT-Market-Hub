import { BarChart3 } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/analytics',
  optional: true,
  defaultEnabled: true,
  order: 5,
  icon: BarChart3,
  navKey: 'nav.analytics',
  descKey: 'modules.analyticsDesc',
  dashboardWidgets: [],
  analyticsSections: ['buyer_competitors'],
  loadPage: () => import('./AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
} satisfies ModuleManifest
