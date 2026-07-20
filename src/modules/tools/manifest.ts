import { Wrench } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/tools',
  order: 90,
  icon: Wrench,
  navKey: 'nav.tools',
  loadPage: () => import('./ToolsPage').then((m) => ({ default: m.ToolsPage }))
} satisfies ModuleManifest
