import { LayoutDashboard } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/',
  end: true,
  order: 0,
  icon: LayoutDashboard,
  navKey: 'nav.dashboard',
  loadPage: () => import('./DashboardPage').then((m) => ({ default: m.DashboardPage }))
} satisfies ModuleManifest
