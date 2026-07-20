import { Zap } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/automation',
  optional: true,
  defaultEnabled: true,
  order: 4,
  icon: Zap,
  navKey: 'nav.automation',
  descKey: 'modules.automationDesc',
  dashboardWidgets: ['automation_pipeline'],
  analyticsSections: [],
  loadPage: () => import('./AutomationPage').then((m) => ({ default: m.AutomationPage }))
} satisfies ModuleManifest
