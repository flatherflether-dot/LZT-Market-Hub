import { Upload } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  path: '/upload',
  optional: true,
  defaultEnabled: true,
  order: 1,
  icon: Upload,
  navKey: 'nav.upload',
  descKey: 'modules.uploadDesc',
  dashboardWidgets: ['upload_success', 'chart_upload_timeline', 'alert_upload'],
  analyticsSections: ['upload_listings'],
  loadPage: () => import('./UploadPage').then((m) => ({ default: m.UploadPage }))
} satisfies ModuleManifest
