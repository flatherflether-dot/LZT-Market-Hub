
export const UPLOAD_STATUS = {
  success: 'success',
  error: 'error',
  skipped: 'skipped'
} as const

export type UploadHistoryStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export function normalizeUploadHistoryStatus(status: string): string {
  if (status === 'failed') return UPLOAD_STATUS.error
  return status
}

export function isUploadHistorySuccess(status: string): boolean {
  return normalizeUploadHistoryStatus(status) === UPLOAD_STATUS.success
}

export function isUploadHistoryFailure(status: string): boolean {
  const s = normalizeUploadHistoryStatus(status)
  return s === UPLOAD_STATUS.error || s === UPLOAD_STATUS.skipped
}
