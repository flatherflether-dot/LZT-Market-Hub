import { Landmark } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/finance',
  optional: true,
  defaultEnabled: true,
  order: 6,
  icon: Landmark,
  navKey: 'nav.finance',
  descKey: 'modules.financeDesc',
  dashboardWidgets: ['finance_balance', 'finance_hold', 'alert_hold'],
  analyticsSections: ['finance_balance'],
  loadPage: () => import('./FinancePage').then((m) => ({ default: m.FinancePage }))
} satisfies ModuleManifest
