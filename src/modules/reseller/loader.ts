import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.reseller.status',
      detailKey: 'loader.module.reseller.detail',
      weight: 1
    }
  ],
  async prepare() {
    await window.api.db.getDeals()
  }
} satisfies ModuleLoaderContribution
