import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.automation.status',
      detailKey: 'loader.module.automation.detail',
      weight: 1
    }
  ],
  async prepare() {
    await window.api.db.getTasks()
  }
} satisfies ModuleLoaderContribution
