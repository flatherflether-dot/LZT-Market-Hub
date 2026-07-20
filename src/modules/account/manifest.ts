import { UserCircle } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  id: 'account',
  path: '/account',
  order: 98,
  icon: UserCircle,
  navKey: 'settings.accountTitle',
  loadPage: () => import('./AccountPage').then((m) => ({ default: m.AccountPage }))
} satisfies ModuleManifest
