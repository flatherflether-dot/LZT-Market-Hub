import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.buyer.status',
      detailKey: 'loader.module.buyer.detail',
      weight: 1
    }
  ],
  async prepare() {
    await Promise.all([
      window.api.db.getWatchFilters(),
      window.api.db.getWatchlist(),
      window.api.db.getMonitorRules()
    ])
  }
} satisfies ModuleLoaderContribution
