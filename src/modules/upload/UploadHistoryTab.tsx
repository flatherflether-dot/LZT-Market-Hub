import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  History,
  Search,
  SkipForward
} from 'lucide-react'
import { Button } from '@components/Button'
import { downloadCsv, toCsv } from '@core/export-csv'
import { useTranslation, type TranslationKey } from '@core/i18n'
import {
  isUploadHistoryFailure,
  isUploadHistorySuccess,
  normalizeUploadHistoryStatus,
  UPLOAD_STATUS
} from '@core/upload-status'
import type { UploadHistoryEntry } from '@renderer/types/database'
import { getCategoryVisual } from './category-visuals'

type StatusFilter = 'all' | 'success' | 'failed' | 'skipped'

function marketUrl(itemId: number): string {
  return `https://lzt.market/${itemId}`
}

function statusBadgeClass(status: string): string {
  const normalized = normalizeUploadHistoryStatus(status)
  if (normalized === UPLOAD_STATUS.success) return 'upload-history-badge-success'
  if (normalized === UPLOAD_STATUS.skipped) return 'upload-history-badge-skipped'
  if (normalized === UPLOAD_STATUS.error) return 'upload-history-badge-error'
  return 'upload-history-badge-pending'
}

function statusLabelKey(status: string): TranslationKey {
  const normalized = normalizeUploadHistoryStatus(status)
  if (normalized === UPLOAD_STATUS.success) return 'status.success'
  if (normalized === UPLOAD_STATUS.skipped) return 'status.skipped'
  if (normalized === UPLOAD_STATUS.error) return 'status.error'
  return 'status.pending'
}

export function useUploadHistoryTab(refreshKey = 0): {
  main: React.ReactNode
  recordCount: number
  successCount: number
} {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<UploadHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const loadHistory = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setEntries(await window.api.db.getUploadHistory())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory, refreshKey])

  const stats = useMemo(() => {
    let success = 0
    let failed = 0
    let skipped = 0
    for (const row of entries) {
      const status = normalizeUploadHistoryStatus(row.status)
      if (status === UPLOAD_STATUS.success) success++
      else if (status === UPLOAD_STATUS.skipped) skipped++
      else if (status === UPLOAD_STATUS.error) failed++
    }
    return { total: entries.length, success, failed, skipped }
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((row) => {
      const status = normalizeUploadHistoryStatus(row.status)
      if (statusFilter === 'success' && status !== UPLOAD_STATUS.success) return false
      if (statusFilter === 'failed' && status !== UPLOAD_STATUS.error) return false
      if (statusFilter === 'skipped' && status !== UPLOAD_STATUS.skipped) return false
      if (q) {
        const hay = `${row.login} ${row.item_id ?? ''} ${row.category ?? ''} ${row.message ?? ''} ${row.status}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, search, statusFilter])

  function exportHistory(): void {
    downloadCsv(
      'upload-history.csv',
      toCsv(
        entries.map((row) => ({
          login: row.login,
          status: row.status,
          item_id: row.item_id,
          category: row.category,
          message: row.message,
          initial_price: row.initial_price,
          current_price: row.current_price,
          created_at: row.created_at
        })),
        ['login', 'status', 'item_id', 'category', 'message', 'initial_price', 'current_price', 'created_at']
      )
    )
  }

  const main = (
    <div className="upload-history">
      <div className="upload-history-stats">
        <div className="upload-history-stat upload-history-stat-total">
          <span>{t('upload.historyTitle')}</span>
          <strong>{stats.total}</strong>
          <History size={16} />
        </div>
        <div className="upload-history-stat upload-history-stat-success">
          <span>{t('status.success')}</span>
          <strong>{stats.success}</strong>
          <CheckCircle2 size={16} />
        </div>
        <div className="upload-history-stat upload-history-stat-error">
          <span>{t('status.error')}</span>
          <strong>{stats.failed}</strong>
          <AlertCircle size={16} />
        </div>
        <div className="upload-history-stat upload-history-stat-skipped">
          <span>{t('status.skipped')}</span>
          <strong>{stats.skipped}</strong>
          <SkipForward size={16} />
        </div>
      </div>

      <div className="upload-history-toolbar">
        <div className="upload-history-search">
          <Search size={16} className="upload-history-search-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('upload.historySearchPlaceholder')}
          />
        </div>

        <div className="upload-history-filters">
          {(['all', 'success', 'failed', 'skipped'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={clsx('upload-history-filter', statusFilter === id && 'active')}
              onClick={() => setStatusFilter(id)}
            >
              {id === 'all'
                ? t('upload.accountsStatusAll')
                : id === 'success'
                  ? t('status.success')
                  : id === 'failed'
                    ? t('status.error')
                    : t('status.skipped')}
            </button>
          ))}
        </div>

        <Button size="sm" variant="secondary" onClick={exportHistory} disabled={entries.length === 0}>
          <Download size={14} />
          {t('common.downloadCsv')}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="upload-history-empty">
          <Clock3 size={40} strokeWidth={1.2} />
          <p>{loading ? t('layout.loadingProfile') : t('upload.noHistory')}</p>
        </div>
      ) : (
        <div className="upload-history-list">
          {filtered.map((row) => {
            const visual = getCategoryVisual(row.category)
            const Icon = visual.icon
            const success = isUploadHistorySuccess(row.status)
            const failed = isUploadHistoryFailure(row.status)
            const skipped = normalizeUploadHistoryStatus(row.status) === UPLOAD_STATUS.skipped

            return (
              <article
                key={row.id}
                className={clsx(
                  'upload-history-row',
                  success && 'is-success',
                  failed && !skipped && 'is-error',
                  skipped && 'is-skipped'
                )}
              >
                <div className="upload-history-icon" style={{ background: visual.gradient }}>
                  {visual.logoUrl ? (
                    <img src={visual.logoUrl} alt="" className="upload-history-logo" />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>

                <div className="upload-history-body">
                  <div className="upload-history-head">
                    <div className="upload-history-login">
                      <code>{row.login}</code>
                      <button
                        type="button"
                        className="upload-history-copy"
                        onClick={() => void navigator.clipboard.writeText(row.login)}
                        aria-label="Copy"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="upload-history-meta">
                    <span className="upload-history-cat">{visual.label}</span>
                    <span className="upload-history-dot">·</span>
                    <time dateTime={row.created_at}>
                      {new Date(row.created_at).toLocaleString()}
                    </time>
                    {row.initial_price != null && (
                      <>
                        <span className="upload-history-dot">·</span>
                        <span>{row.initial_price.toLocaleString('ru-RU')} ₽</span>
                      </>
                    )}
                  </div>

                  {row.message && (
                    <p className={clsx('upload-history-message', failed && 'is-error')}>{row.message}</p>
                  )}
                </div>

                <div className="upload-history-actions">
                  <span className={clsx('upload-history-badge', statusBadgeClass(row.status))}>
                    {t(statusLabelKey(row.status))}
                  </span>
                  {row.item_id ? (
                    <a
                      href={marketUrl(row.item_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="upload-history-lot-link"
                    >
                      <span>#{row.item_id}</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="upload-history-lot-empty">—</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  return { main, recordCount: filtered.length, successCount: stats.success }
}
