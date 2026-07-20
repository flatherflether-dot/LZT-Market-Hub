import { useState } from 'react'
import clsx from 'clsx'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import { useTranslation } from '@core/i18n'

interface SteamGuardPanelProps {
  itemId?: number
  showItemInput?: boolean
  inModal?: boolean
  layout?: 'default' | 'studio'
}

export function SteamGuardPanel({
  itemId: controlledId,
  showItemInput = true,
  inModal = false,
  layout = 'default'
}: SteamGuardPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const [localId, setLocalId] = useState('')
  const [guardCode, setGuardCode] = useState<string | null>(null)
  const [mafileCode, setMafileCode] = useState<string | null>(null)
  const [mafileJson, setMafileJson] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const id = controlledId ?? (Number(localId) || 0)

  async function fetchGuardCode(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getGuardCode(id)
      const code = data.code ?? data.guard_code ?? JSON.stringify(data)
      setGuardCode(String(code))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchMafileCode(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getMafileConfirmationCode(id)
      const code = data.code ?? data.guard_code ?? JSON.stringify(data)
      setMafileCode(String(code))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function confirmSda(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      await getApiClient().confirmSda(id)
      setStatus(t('steamGuard.sdaOk'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function downloadMafile(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getMafile<unknown>(id)
      const json = JSON.stringify(data, null, 2)
      setMafileJson(json)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mafile-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus(t('steamGuard.mafileDownloaded'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function deleteMafile(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      await getApiClient().removeMafile(id)
      setMafileJson(null)
      setStatus(t('steamGuard.mafileDeleted'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const studio = layout === 'studio'

  return (
    <div className={clsx('steam-guard-panel', studio && 'steam-guard-panel-studio')}>
      {showItemInput && !controlledId && (
        <Input
          label={t('common.itemId')}
          type="number"
          value={localId}
          onChange={(e) => {
            setLocalId(e.target.value)
            setGuardCode(null)
            setMafileCode(null)
            setMafileJson(null)
          }}
        />
      )}
      <div
        className={clsx(
          studio ? 'reseller-action-grid' : inModal ? 'lot-tool-actions' : 'row-actions row-actions-wrap'
        )}
      >
        <Button
          size={studio || inModal ? undefined : 'sm'}
          onClick={() => void fetchGuardCode()}
          disabled={!id || loading}
        >
          {t('steamGuard.getCode')}
        </Button>
        <Button
          size={studio || inModal ? undefined : 'sm'}
          variant="secondary"
          onClick={() => void fetchMafileCode()}
          disabled={!id || loading}
        >
          {t('steamGuard.getMafileCode')}
        </Button>
        <Button
          size={studio || inModal ? undefined : 'sm'}
          variant="secondary"
          onClick={() => void confirmSda()}
          disabled={!id || loading}
        >
          {t('steamGuard.confirmSda')}
        </Button>
        <Button
          size={studio || inModal ? undefined : 'sm'}
          variant="secondary"
          onClick={() => void downloadMafile()}
          disabled={!id || loading}
        >
          {t('steamGuard.downloadMafile')}
        </Button>
        <Button
          size={studio || inModal ? undefined : 'sm'}
          variant="secondary"
          onClick={() => void deleteMafile()}
          disabled={!id || loading}
        >
          {t('steamGuard.deleteMafile')}
        </Button>
      </div>
      {guardCode && (
        <div className={clsx('steam-guard-code', studio && 'steam-guard-code-studio')}>
          <span className="muted">{t('steamGuard.codeLabel')}</span>
          <strong>{guardCode}</strong>
        </div>
      )}
      {mafileCode && (
        <div className={clsx('steam-guard-code', studio && 'steam-guard-code-studio')}>
          <span className="muted">{t('steamGuard.mafileCodeLabel')}</span>
          <strong>{mafileCode}</strong>
        </div>
      )}
      {mafileJson && (
        <pre className="steam-guard-mafile-preview">{mafileJson.slice(0, 400)}{mafileJson.length > 400 ? '…' : ''}</pre>
      )}
      {status && <p className={clsx('form-status', studio && 'reseller-status-text')}>{status}</p>}
    </div>
  )
}
