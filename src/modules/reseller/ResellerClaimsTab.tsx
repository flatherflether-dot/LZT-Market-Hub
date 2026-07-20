import clsx from 'clsx'
import { AlertTriangle, Inbox, RefreshCw, Scale, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Input, Textarea } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketClaim } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'

function claimStateClass(state?: string): string {
  const value = (state ?? '').toLowerCase()
  if (value.includes('open') || value.includes('pending') || value.includes('wait')) return 'is-pending'
  if (value.includes('close') || value.includes('resolve') || value.includes('accept')) return 'is-success'
  if (value.includes('reject') || value.includes('cancel') || value.includes('deny')) return 'is-error'
  return 'is-neutral'
}

function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export function ResellerClaimsTab(): React.ReactNode {
  const { t } = useTranslation()
  const [claims, setClaims] = useState<MarketClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')
  const [newItemId, setNewItemId] = useState('')
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const { data } = await getApiClient().getClaims()
      setClaims(data.claims ?? [])
    } catch (e) {
      if (!silent) {
        const message = e instanceof LztApiError ? e.message : t('common.error')
        setStatus(message)
        setStatusKind(isTokenError(message) ? 'error' : 'error')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  const openCount = useMemo(
    () => claims.filter((c) => claimStateClass(c.claim_state) === 'is-pending').length,
    [claims]
  )

  async function submitClaim(): Promise<void> {
    const id = Number(newItemId)
    if (!id || !newBody.trim()) return
    setSubmitting(true)
    setStatus(null)
    try {
      await getApiClient().createClaim(id, newBody.trim())
      setNewItemId('')
      setNewBody('')
      setStatus(t('claims.created'))
      setStatusKind('success')
      await refresh(false)
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = Boolean(newItemId && newBody.trim() && !submitting)

  return (
    <div className="dashboard-main-stack">
      <Card className="card-main">
        <div className="reseller-claims-stats">
          <div className="dash-hero-stat">
            <Inbox size={15} />
            <span className="dash-hero-stat-label">{t('claims.totalCount')}</span>
            <strong>{claims.length}</strong>
          </div>
          <div className="dash-hero-stat">
            <AlertTriangle size={15} />
            <span className="dash-hero-stat-label">{t('claims.openCount')}</span>
            <strong className={openCount > 0 ? 'reseller-claims-open-count' : undefined}>{openCount}</strong>
          </div>
        </div>

        {loading && claims.length === 0 ? (
          <div className="reseller-claims-empty-panel is-loading">
            <div className="reseller-claims-empty-icon">
              <RefreshCw size={28} className="spin-icon" />
            </div>
            <strong>{t('layout.loadingProfile')}</strong>
          </div>
        ) : claims.length === 0 ? (
          <div className="reseller-claims-empty-panel">
            <div className="reseller-claims-empty-icon">
              <Scale size={28} />
            </div>
            <strong>{t('claims.emptyTitle')}</strong>
            <p>{t('claims.emptyDesc')}</p>
            <a className="reseller-claims-empty-action" href="#claims-create">
              {t('claims.emptyAction')}
            </a>
          </div>
        ) : (
          <div className="reseller-claims-list">
            {claims.map((claim) => (
              <article key={claim.claim_id} className="reseller-claim-row">
                <div className="reseller-claim-icon">
                  <AlertTriangle size={16} />
                </div>
                <div className="reseller-claim-body">
                  <div className="reseller-claim-head">
                    <strong>#{claim.claim_id}</strong>
                    {claim.item_id != null && (
                      <a
                        className="reseller-claim-item"
                        href={`https://lzt.market/${claim.item_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('common.itemId')} {claim.item_id}
                      </a>
                    )}
                    {claim.claim_state && (
                      <span className={clsx('reseller-claim-badge', claimStateClass(claim.claim_state))}>
                        {claim.claim_state}
                      </span>
                    )}
                    {claim.type && <span className="reseller-claim-type">{claim.type}</span>}
                  </div>
                  {claim.post_body && <p className="reseller-claim-text">{claim.post_body}</p>}
                  {claim.username && (
                    <span className="reseller-claim-user">@{claim.username}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="card-main" id="claims-create" style={{ scrollMarginTop: 16 }}>
        <h3 className="reseller-claims-form-title">{t('claims.createTitle')}</h3>
        <p className="reseller-claims-form-desc">{t('claims.createDesc')}</p>
        <div className="reseller-claims-create-fields">
          <Input
            label={t('common.itemId')}
            type="number"
            value={newItemId}
            onChange={(e) => setNewItemId(e.target.value)}
          />
          <Textarea
            label={t('claims.description')}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={4}
          />
        </div>

        <div className="reseller-claims-create-actions">
          <Button
            variant="primary"
            className="reseller-claims-submit"
            onClick={() => void submitClaim()}
            disabled={!canSubmit}
          >
            <Send size={16} />
            {submitting ? '…' : t('claims.submit')}
          </Button>
        </div>

        {status && (
          <div
            className={clsx(
              'reseller-status-banner',
              statusKind === 'success' && 'is-success',
              statusKind === 'error' && 'is-error'
            )}
          >
            {isTokenError(status) ? t('layout.apiOfflineHint') : status}
          </div>
        )}
      </Card>
    </div>
  )
}
