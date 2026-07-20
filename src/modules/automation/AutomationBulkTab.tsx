import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpCircle,
  CheckCircle,
  Layers,
  Pin,
  PinOff,
  Play,
  Tag,
  Wallet,
  XCircle,
  Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import {
  buildBumpBatchJobs,
  buildCloseBatchJobs,
  buildEditPriceBatchJobs,
  buildOpenBatchJobs,
  buildStickBatchJobs,
  buildTagBatchJobs,
  buildUnstickBatchJobs,
  runBatchInChunks
} from '@core/batch-helper'
import type { MarketTag } from '@core/constants'
import { useTranslation } from '@core/i18n'

const BULK_ACTIONS = [
  { id: 'bump', icon: ArrowUpCircle, labelKey: 'automation.bulkBump' },
  { id: 'open', icon: CheckCircle, labelKey: 'automation.bulkOpen' },
  { id: 'close', icon: XCircle, labelKey: 'automation.bulkClose' },
  { id: 'edit-price', icon: Wallet, labelKey: 'automation.bulkSetPrice' },
  { id: 'tag', icon: Tag, labelKey: 'automation.bulkTag' },
  { id: 'stick', icon: Pin, labelKey: 'automation.bulkStick' },
  { id: 'unstick', icon: PinOff, labelKey: 'automation.bulkUnstick' }
] as const satisfies ReadonlyArray<{ id: string; icon: LucideIcon; labelKey: string }>

export function AutomationBulkTab(): React.ReactNode {
  const { t } = useTranslation()
  const [bulkAction, setBulkAction] = useState('bump')
  const [bulkIds, setBulkIds] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkTagId, setBulkTagId] = useState('')
  const [useBatchApi, setUseBatchApi] = useState(false)
  const [tags, setTags] = useState<MarketTag[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    void getApiClient()
      .listTags()
      .then(({ data }) => setTags(data.tags ?? []))
      .catch(() => setTags([]))
  }, [])

  const idCount = useMemo(
    () => bulkIds.split(/[,\s]+/).map(Number).filter(Boolean).length,
    [bulkIds]
  )

  const canRun =
    idCount > 0 && !(bulkAction === 'tag' && !bulkTagId) && !(bulkAction === 'edit-price' && !bulkPrice) && !running

  async function runBulkAction(): Promise<void> {
    const ids = bulkIds.split(/[,\s]+/).map(Number).filter(Boolean)
    if (!ids.length) return
    setRunning(true)
    setStatus(null)
    try {
      if (bulkAction === 'tag') {
        const tagId = Number(bulkTagId)
        if (!tagId) {
          setStatus(t('tags.selectTag'))
          setStatusKind('error')
          return
        }
        if (useBatchApi) {
          const result = await runBatchInChunks(buildTagBatchJobs(ids, tagId))
          setStatus(t('automation.batchOk', { ok: result.ok, failed: result.failed }))
        } else {
          const result = await getApiClient().bulkTagItems(ids, tagId)
          setStatus(
            t('automation.bulkTagOk', {
              count: result.ok,
              tag: tags.find((x) => x.tag_id === tagId)?.title ?? String(tagId)
            })
          )
        }
        setStatusKind('success')
        await window.api.db.logActivity('automation', 'bulk_tag', String(tagId))
        return
      }

      if (useBatchApi && bulkAction !== 'edit-price') {
        const jobs =
          bulkAction === 'bump'
            ? buildBumpBatchJobs(ids)
            : bulkAction === 'open'
              ? buildOpenBatchJobs(ids)
              : bulkAction === 'stick'
                ? buildStickBatchJobs(ids)
                : bulkAction === 'unstick'
                  ? buildUnstickBatchJobs(ids)
                  : buildCloseBatchJobs(ids)
        const result = await runBatchInChunks(jobs)
        setStatus(t('automation.batchOk', { ok: result.ok, failed: result.failed }))
        setStatusKind('success')
        await window.api.db.logActivity('automation', 'batch_action', bulkAction)
        return
      }

      if (useBatchApi && bulkAction === 'edit-price' && bulkPrice) {
        const result = await runBatchInChunks(buildEditPriceBatchJobs(ids, bulkPrice))
        setStatus(t('automation.batchOk', { ok: result.ok, failed: result.failed }))
        setStatusKind('success')
        return
      }

      if (bulkAction === 'stick' || bulkAction === 'unstick') {
        await Promise.all(
          ids.map((id) => (bulkAction === 'stick' ? getApiClient().stickItem(id) : getApiClient().unstickItem(id)))
        )
        setStatus(t('automation.bulkOk', { count: ids.length }))
        setStatusKind('success')
        await window.api.db.logActivity('automation', 'bulk_action', bulkAction)
        return
      }

      const body: Record<string, unknown> = { action: bulkAction, item_ids: ids }
      if (bulkAction === 'edit-price') {
        body.price = bulkPrice
        body.currency = 'rub'
      }
      await getApiClient().bulkAction(body as { action: string; item_ids: number[] })
      setStatus(t('automation.bulkOk', { count: ids.length }))
      setStatusKind('success')
      await window.api.db.logActivity('automation', 'bulk_action', bulkAction)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('automation.bulkFailed'))
      setStatusKind('error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="automation-hub">
      <section className="automation-section automation-bulk-card">
        <header className="automation-bulk-head">
          <div className="automation-bulk-head-main">
            <div className="automation-bulk-head-icon">
              <Layers size={18} />
            </div>
            <div>
              <h3>{t('automation.bulkActions')}</h3>
              <p>{t('automation.bulkActionTitle')}</p>
            </div>
          </div>
          <span className="automation-bulk-count-badge">{idCount}</span>
        </header>

        <div className="automation-bulk-body">
          <div className="automation-bulk-actions">
            <span className="automation-bulk-actions-label">{t('common.action')}</span>
            <div className="automation-bulk-actions-grid">
              {BULK_ACTIONS.map((action) => {
                const Icon = action.icon
                const active = bulkAction === action.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={clsx('automation-bulk-action-pill', active && 'is-active')}
                    onClick={() => setBulkAction(action.id)}
                  >
                    <Icon size={15} />
                    {t(action.labelKey as 'automation.bulkBump')}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="automation-bulk-panel">
            <div className="automation-bulk-fields">
              {bulkAction === 'edit-price' && (
                <Input
                  label={t('upload.newPriceRub')}
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="500"
                />
              )}
              {bulkAction === 'tag' && (
                <Select
                  label={t('tags.selectTag')}
                  value={bulkTagId}
                  onChange={(e) => setBulkTagId(e.target.value)}
                  options={[
                    { value: '', label: '—' },
                    ...tags.map((tag) => ({ value: String(tag.tag_id), label: tag.title }))
                  ]}
                />
              )}
              <Input
                label={t('automation.itemIdsComma')}
                value={bulkIds}
                onChange={(e) => setBulkIds(e.target.value)}
                placeholder={t('automation.itemIdsPlaceholder')}
              />
            </div>

            <div className="automation-bulk-options">
              <label className="automation-bulk-toggle">
                <input type="checkbox" checked={useBatchApi} onChange={(e) => setUseBatchApi(e.target.checked)} />
                <span>{t('automation.useBatchApi')}</span>
              </label>
              <p className="automation-bulk-hint">{t('automation.useBatchApiHint')}</p>
            </div>
          </div>

          <div className="automation-bulk-footer">
            <Button className="automation-bulk-run" onClick={() => void runBulkAction()} disabled={!canRun}>
              <Play size={14} />
              {running ? '…' : t('automation.runBulk')}
            </Button>

            {status && (
              <div
                className={clsx(
                  'automation-status-banner',
                  statusKind === 'success' && 'is-success',
                  statusKind === 'error' && 'is-error'
                )}
              >
                <Zap size={14} />
                {status}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
