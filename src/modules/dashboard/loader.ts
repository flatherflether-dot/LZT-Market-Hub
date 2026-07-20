import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.dashboard.status',
      detailKey: 'loader.module.dashboard.detail',
      weight: 1
    }
  ],
  async prepare() {
    await window.api.db.getDashboardStats()
  }
} satisfies ModuleLoaderContribution
