import { Settings } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/settings',
  order: 99,
  icon: Settings,
  navKey: 'nav.settings',
  loadPage: () => import('./SettingsPage').then((m) => ({ default: m.SettingsPage }))
} satisfies ModuleManifest
