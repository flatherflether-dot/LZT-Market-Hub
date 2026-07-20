import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.upload.status',
      detailKey: 'loader.module.upload.detail',
      weight: 1
    }
  ],
  async prepare() {
    await Promise.all([
      window.api.db.getUploadHistory(),
      window.api.db.getImapConfigs()
    ])
  }
} satisfies ModuleLoaderContribution
