import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.tools.status',
      detailKey: 'loader.module.tools.detail',
      weight: 1
    }
  ]
} satisfies ModuleLoaderContribution
