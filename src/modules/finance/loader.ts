import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.finance.status',
      detailKey: 'loader.module.finance.detail',
      weight: 1
    }
  ],
  async prepare() {
    await window.api.finance.invoiceWebhookStatus()
  }
} satisfies ModuleLoaderContribution
