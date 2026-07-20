import { ShoppingCart } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/buyer',
  optional: true,
  defaultEnabled: true,
  order: 3,
  icon: ShoppingCart,
  navKey: 'nav.buyer',
  descKey: 'modules.buyerDesc',
  dashboardWidgets: ['buyer_autobuy', 'buyer_monitor', 'alert_monitor'],
  analyticsSections: [],
  loadPage: () => import('./BuyerPage').then((m) => ({ default: m.BuyerPage }))
} satisfies ModuleManifest
