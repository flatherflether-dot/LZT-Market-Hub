import { useCallback, useEffect, useState } from 'react'
import { Card } from '@components/Card'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketClaim } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'

export function ClaimsPanel(): React.ReactNode {
  const { t } = useTranslation()
  const [claims, setClaims] = useState<MarketClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [newItemId, setNewItemId] = useState('')
  const [newBody, setNewBody] = useState('')

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const { data } = await getApiClient().getClaims()
      setClaims(data.claims ?? [])
    } catch (e) {
      if (!silent) setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  async function submitClaim(): Promise<void> {
    const id = Number(newItemId)
    if (!id || !newBody.trim()) return
    try {
      await getApiClient().createClaim(id, newBody.trim())
      setNewItemId('')
      setNewBody('')
      setStatus(t('claims.created'))
      await refresh(false)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  return (
    <>
      <Card title={t('claims.listTitle')} description={t('claims.listDesc')} className="card-main">
        {claims.length === 0 ? (
          <p className="empty-state">{loading ? '…' : t('claims.empty')}</p>
        ) : (
          <div className="table-wrap table-spaced">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('common.itemId')}</th>
                  <th>{t('claims.state')}</th>
                  <th>{t('common.type')}</th>
                  <th>{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.claim_id}>
                    <td>{c.claim_id}</td>
                    <td>{c.item_id ?? '—'}</td>
                    <td>{c.claim_state ?? '—'}</td>
                    <td>{c.type ?? '—'}</td>
                    <td className="cell-truncate">{c.post_body ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={t('claims.createTitle')} className="card-main">
        <Input label={t('common.itemId')} type="number" value={newItemId} onChange={(e) => setNewItemId(e.target.value)} />
        <Input label={t('claims.description')} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
        <Button size="sm" onClick={() => void submitClaim()} disabled={!newItemId || !newBody.trim()}>
          {t('claims.submit')}
        </Button>
        {status && <p className="form-status">{status}</p>}
      </Card>
    </>
  )
}
