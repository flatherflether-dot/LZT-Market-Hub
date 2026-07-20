import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.settings.status',
      detailKey: 'loader.module.settings.detail',
      weight: 1
    }
  ],
  async prepare() {
    await window.api.db.getAccounts()
  }
} satisfies ModuleLoaderContribution
