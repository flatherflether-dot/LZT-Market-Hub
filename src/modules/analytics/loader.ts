import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.analytics.status',
      detailKey: 'loader.module.analytics.detail',
      weight: 1
    }
  ]
} satisfies ModuleLoaderContribution
