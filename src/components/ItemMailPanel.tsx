import { useState } from 'react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MailLetter } from '@core/constants'
import { useTranslation } from '@core/i18n'

interface ItemMailPanelProps {
  itemId?: number
  showItemInput?: boolean
  inModal?: boolean
}

export function ItemMailPanel({ itemId: controlledId, showItemInput = true, inModal = false }: ItemMailPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const [localId, setLocalId] = useState('')
  const [emailCode, setEmailCode] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [letters, setLetters] = useState<MailLetter[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const id = controlledId ?? (Number(localId) || 0)

  async function fetchEmailCode(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getEmailCode(id)
      setEmailCode(String(data.code ?? data.email_code ?? JSON.stringify(data)))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchLetters(): Promise<void> {
    if (!id) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getItemLetters<{ letters?: MailLetter[] }>(id)
      const list = data.letters ?? (Array.isArray(data) ? (data as MailLetter[]) : [])
      setLetters(list)
      if (!list.length) setStatus(t('itemMail.noLetters'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchTempPassword(): Promise<void> {
    if (!id) return
    if (!window.confirm(t('itemMail.tempPasswordWarn'))) return
    setLoading(true)
    setStatus(null)
    try {
      const { data } = await getApiClient().getTempEmailPassword(id)
      setTempPassword(String(data.password ?? JSON.stringify(data)))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="item-mail-panel">
      {showItemInput && !controlledId && (
        <Input
          label={t('common.itemId')}
          type="number"
          value={localId}
          onChange={(e) => {
            setLocalId(e.target.value)
            setEmailCode(null)
            setLetters([])
            setTempPassword(null)
          }}
        />
      )}
      <div className={inModal ? 'lot-tool-actions' : 'row-actions row-actions-wrap'}>
        <Button size={inModal ? undefined : 'sm'} onClick={() => void fetchEmailCode()} disabled={!id || loading}>
          {t('itemMail.emailCode')}
        </Button>
        <Button size={inModal ? undefined : 'sm'} variant="secondary" onClick={() => void fetchLetters()} disabled={!id || loading}>
          {t('itemMail.letters')}
        </Button>
        <Button size={inModal ? undefined : 'sm'} variant="secondary" onClick={() => void fetchTempPassword()} disabled={!id || loading}>
          {t('itemMail.tempPassword')}
        </Button>
      </div>
      {emailCode && (
        <div className="steam-guard-code">
          <span className="muted">{t('itemMail.emailCodeLabel')}</span>
          <strong>{emailCode}</strong>
        </div>
      )}
      {tempPassword && (
        <div className="steam-guard-code">
          <span className="muted">{t('itemMail.tempPasswordLabel')}</span>
          <strong>{tempPassword}</strong>
        </div>
      )}
      {letters.length > 0 && (
        <div className="item-mail-letters">
          {letters.slice(0, 5).map((letter, i) => (
            <div key={i} className="item-mail-letter">
              <strong>{letter.subject ?? t('itemMail.noSubject')}</strong>
              <span className="muted">{letter.from ?? ''}</span>
              <p>{(letter.body ?? letter.text ?? '').slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
