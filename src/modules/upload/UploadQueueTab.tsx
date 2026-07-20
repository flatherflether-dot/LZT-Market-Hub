import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Layers,
  ListTodo,
  Loader2,
  Upload
} from 'lucide-react'
import { Button } from '@components/Button'
import { useTranslation, type TranslationKey } from '@core/i18n'

export type UploadQueueRow = {
  id: string
  login: string
  loginPassword?: string
  price?: number
  status: 'pending' | 'processing' | 'success' | 'error' | 'skipped'
  message?: string
  itemId?: number
}

type StatusFilter = 'all' | 'pending' | 'success' | 'failed'

interface UploadQueueTabProps {
  queue: UploadQueueRow[]
  defaultPrice: string
  currencyLabel: string
  uploading: boolean
  paused: boolean
  onStartUpload: () => void
  onTogglePause: () => void
  onGoToUpload: () => void
}

function resolveLogin(row: UploadQueueRow): string {
  return (row.login || row.loginPassword?.split(':')[0] || '—').trim()
}

function marketUrl(itemId: number): string {
  return `https://lzt.market/${itemId}`
}

function statusBadgeClass(status: UploadQueueRow['status']): string {
  if (status === 'success') return 'upload-queue-badge-success'
  if (status === 'error') return 'upload-queue-badge-error'
  if (status === 'skipped') return 'upload-queue-badge-skipped'
  if (status === 'processing') return 'upload-queue-badge-processing'
  return 'upload-queue-badge-pending'
}

function statusLabelKey(status: UploadQueueRow['status']): TranslationKey {
  return `status.${status}` as TranslationKey
}

export function UploadQueueTab({
  queue,
  defaultPrice,
  currencyLabel,
  uploading,
  paused,
  onStartUpload,
  onTogglePause,
  onGoToUpload
}: UploadQueueTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const stats = useMemo(() => {
    let success = 0
    let failed = 0
    let pending = 0
    for (const row of queue) {
      if (row.status === 'success') success++
      else if (row.status === 'error' || row.status === 'skipped') failed++
      else pending++
    }
    return { total: queue.length, success, failed, pending }
  }, [queue])

  const filtered = useMemo(() => {
    return queue.filter((row) => {
      if (statusFilter === 'success' && row.status !== 'success') return false
      if (statusFilter === 'failed' && row.status !== 'error' && row.status !== 'skipped') return false
      if (statusFilter === 'pending' && row.status !== 'pending' && row.status !== 'processing') return false
      return true
    })
  }, [queue, statusFilter])

  return (
    <div className="upload-queue">
      <div className="upload-queue-stats">
        <div className="upload-queue-stat upload-queue-stat-total">
          <span>{t('upload.queueTitle')}</span>
          <strong>{stats.total}</strong>
          <Layers size={16} />
        </div>
        <div className="upload-queue-stat upload-queue-stat-pending">
          <span>{t('status.pending')}</span>
          <strong>{stats.pending}</strong>
          <Clock3 size={16} />
        </div>
        <div className="upload-queue-stat upload-queue-stat-success">
          <span>{t('status.success')}</span>
          <strong>{stats.success}</strong>
          <CheckCircle2 size={16} />
        </div>
        <div className="upload-queue-stat upload-queue-stat-error">
          <span>{t('status.error')}</span>
          <strong>{stats.failed}</strong>
          <AlertCircle size={16} />
        </div>
      </div>

      <div className="upload-queue-toolbar">
        <div className="upload-queue-filters">
          {(['all', 'pending', 'success', 'failed'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={clsx('upload-queue-filter', statusFilter === id && 'active')}
              onClick={() => setStatusFilter(id)}
            >
              {id === 'all'
                ? t('upload.accountsStatusAll')
                : id === 'pending'
                  ? t('status.pending')
                  : id === 'success'
                    ? t('status.success')
                    : t('status.error')}
            </button>
          ))}
        </div>

        <div className="upload-queue-toolbar-actions">
          <Button size="sm" variant="secondary" onClick={onGoToUpload}>
            <Upload size={14} />
            {t('upload.queueGoToUpload')}
          </Button>
          <Button size="sm" onClick={onStartUpload} disabled={uploading || queue.length === 0}>
            {uploading ? t('upload.uploading') : t('upload.startUpload')}
          </Button>
          {uploading && (
            <Button size="sm" variant="ghost" onClick={onTogglePause}>
              {paused ? t('upload.resumeQueue') : t('upload.pauseQueue')}
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="upload-queue-empty">
          <ListTodo size={40} strokeWidth={1.2} />
          <p>{queue.length === 0 ? t('upload.emptyQueue') : t('upload.queueNoMatches')}</p>
          {queue.length === 0 && (
            <Button size="sm" variant="secondary" onClick={onGoToUpload}>
              {t('upload.queueGoToUpload')}
            </Button>
          )}
        </div>
      ) : (
        <div className="upload-queue-list">
          {filtered.map((row) => {
            const login = resolveLogin(row)
            const rowPrice = row.price ?? (Number(defaultPrice) || 0)
            const isProcessing = row.status === 'processing'

            return (
              <article
                key={row.id}
                className={clsx(
                  'upload-queue-row',
                  row.status === 'success' && 'is-success',
                  row.status === 'error' && 'is-error',
                  row.status === 'skipped' && 'is-skipped',
                  isProcessing && 'is-processing'
                )}
              >
                <div className="upload-queue-icon">
                  {isProcessing ? <Loader2 size={18} className="spin-icon" /> : <ListTodo size={18} />}
                </div>

                <div className="upload-queue-body">
                  <div className="upload-queue-head">
                    <div className="upload-queue-login">
                      <code>{login}</code>
                      {login !== '—' && (
                        <button
                          type="button"
                          className="upload-queue-copy"
                          onClick={() => void navigator.clipboard.writeText(login)}
                          aria-label="Copy"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="upload-queue-meta">
                    <span>{rowPrice.toLocaleString('ru-RU')} {currencyLabel}</span>
                    {row.message && (
                      <>
                        <span className="upload-queue-dot">·</span>
                        <span className={clsx('upload-queue-message-inline', row.status === 'error' && 'is-error')}>
                          {row.message}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="upload-queue-actions">
                  <span className={clsx('upload-queue-badge', statusBadgeClass(row.status))}>
                    {isProcessing && <Loader2 size={11} className="spin-icon" />}
                    {t(statusLabelKey(row.status))}
                  </span>
                  {row.itemId ? (
                    <a
                      href={marketUrl(row.itemId)}
                      target="_blank"
                      rel="noreferrer"
                      className="upload-queue-lot-link"
                    >
                      <span>#{row.itemId}</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="upload-queue-lot-empty">—</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
