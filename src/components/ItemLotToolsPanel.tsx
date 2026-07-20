import { useEffect, useState } from 'react'
import { CheckCircle2, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { ItemMailPanel } from '@components/ItemMailPanel'
import { SteamGuardPanel } from '@components/SteamGuardPanel'
import { getApiClient, LztApiError } from '@core/api-client'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'

interface ItemLotToolsPanelProps {
  itemId?: number
  showItemInput?: boolean
  showListingActions?: boolean
  showMarketChecks?: boolean
  inModal?: boolean
}

export function ItemLotToolsPanel({
  itemId,
  showItemInput = false,
  showListingActions = false,
  showMarketChecks = false,
  inModal = false
}: ItemLotToolsPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const [note, setNote] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [autoBuyPrice, setAutoBuyPrice] = useState<number | null>(null)
  const [inventoryValue, setInventoryValue] = useState<number | null>(null)
  const [guaranteeInfo, setGuaranteeInfo] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId) {
      setNote('')
      setAutoBuyPrice(null)
      setInventoryValue(null)
      setGuaranteeInfo(null)
      return
    }
    void getApiClient()
      .getItem<{ item?: { note?: string }; note?: string }>(itemId)
      .then(({ data }) => {
        const item = (data as { item?: { note?: string } }).item ?? data
        setNote((item as { note?: string }).note ?? '')
      })
      .catch(() => setNote(''))
  }, [itemId])

  async function saveNote(): Promise<void> {
    if (!itemId) return
    try {
      await getApiClient().editItemNote(itemId, note)
      setStatus(t('itemTools.noteSaved'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function deleteNote(): Promise<void> {
    if (!itemId) return
    try {
      await getApiClient().deleteItemNote(itemId)
      setNote('')
      setStatus(t('itemTools.noteDeleted'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function changePassword(): Promise<void> {
    if (!itemId || !newPassword.trim()) return
    try {
      await getApiClient().changeItemPassword(itemId, newPassword.trim())
      setNewPassword('')
      setStatus(t('itemTools.passwordChanged'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function fetchAutoBuyPrice(): Promise<void> {
    if (!itemId) return
    try {
      const { data } = await getApiClient().getAutoBuyPrice(itemId)
      setAutoBuyPrice(data.price ?? data.auto_buy_price ?? null)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function fetchInventoryValue(refresh = false): Promise<void> {
    if (!itemId) return
    try {
      const { data } = refresh
        ? await getApiClient().updateSteamInventoryValue(itemId)
        : await getApiClient().getSteamInventoryValue(itemId)
      setInventoryValue(data.value ?? data.inventory_value ?? data.steam_inventory_value ?? null)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function checkGuarantee(): Promise<void> {
    if (!itemId) return
    try {
      const { data } = await getApiClient().checkGuarantee(itemId)
      const msg = data.message ?? (data.can_refuse ? t('itemTools.guaranteeCanRefuse') : t('itemTools.guaranteeRisk'))
      setGuaranteeInfo(msg)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function stickListing(stick: boolean): Promise<void> {
    if (!itemId) return
    try {
      if (stick) await getApiClient().stickItem(itemId)
      else await getApiClient().unstickItem(itemId)
      setStatus(stick ? t('itemTools.stuck') : t('itemTools.unstuck'))
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function checkAccount(): Promise<void> {
    if (!itemId) return
    try {
      const { data } = await getApiClient().checkAccount<{ message?: string; status?: string }>(itemId)
      const msg = data.message ?? data.status ?? t('upload.accountsCheckOk')
      setStatus(msg)
      notify(t('upload.accountsCheckTitle'), msg, 'success')
    } catch (e) {
      const msg = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(msg)
      notify(t('upload.accountsCheckTitle'), msg, 'error')
    }
  }

  async function checkGoods(): Promise<void> {
    if (!itemId) return
    try {
      const { data } = await getApiClient().checkItemGoods<{ message?: string }>(itemId)
      const msg = data.message ?? t('upload.accountsCheckGoodsOk')
      setStatus(msg)
      notify(t('upload.accountsCheckGoodsTitle'), msg, 'success')
    } catch (e) {
      const msg = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(msg)
      notify(t('upload.accountsCheckGoodsTitle'), msg, 'error')
    }
  }

  async function bumpListing(): Promise<void> {
    if (!itemId) return
    try {
      await getApiClient().bumpItem(itemId)
      setStatus(t('upload.accountsBumped'))
      notify(t('upload.accountsTitle'), t('upload.accountsBumped'), 'success')
    } catch (e) {
      const msg = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(msg)
      notify(t('upload.accountsTitle'), msg, 'error')
    }
  }

  const actionsClass = inModal ? 'lot-tool-actions' : 'row-actions row-actions-wrap'
  const btnSize = inModal ? undefined : 'sm'

  if (!itemId && !showItemInput) {
    return <p className="empty-state form-hint">{t('itemTools.selectItem')}</p>
  }

  return (
    <div className={inModal ? 'item-lot-tools item-lot-tools-modal' : 'item-lot-tools'}>
      {showMarketChecks && itemId && (
        <section className="item-lot-section">
          <h4 className="item-lot-section-title">{t('upload.accountsMarketActions')}</h4>
          <div className={actionsClass}>
            <Button size={btnSize} onClick={() => void checkAccount()}>
              <CheckCircle2 size={16} /> {t('upload.accountsCheckValid')}
            </Button>
            <Button size={btnSize} variant="secondary" onClick={() => void checkGoods()}>
              {t('upload.accountsCheckGoods')}
            </Button>
            <Button size={btnSize} variant="secondary" onClick={() => void bumpListing()}>
              <Zap size={16} /> {t('upload.accountsBump')}
            </Button>
          </div>
        </section>
      )}
      <section className="item-lot-section">
        <h4 className="item-lot-section-title">{t('itemMail.title')}</h4>
        <ItemMailPanel itemId={itemId} showItemInput={showItemInput && !itemId} inModal={inModal} />
      </section>
      <section className="item-lot-section">
        <h4 className="item-lot-section-title">{t('steamGuard.title')}</h4>
        <SteamGuardPanel itemId={itemId} showItemInput={showItemInput && !itemId} inModal={inModal} />
      </section>
      {itemId && (
        <>
          {showListingActions && (
            <section className="item-lot-section">
              <h4 className="item-lot-section-title">{t('itemTools.listingActions')}</h4>
              <div className={actionsClass}>
                <Button size={btnSize} variant="secondary" onClick={() => void stickListing(true)}>{t('itemTools.stick')}</Button>
                <Button size={btnSize} variant="secondary" onClick={() => void stickListing(false)}>{t('itemTools.unstick')}</Button>
                <Button size={btnSize} variant="secondary" onClick={() => void checkGuarantee()}>{t('itemTools.checkGuarantee')}</Button>
              </div>
              {guaranteeInfo && <p className="form-hint">{guaranteeInfo}</p>}
            </section>
          )}
          <section className="item-lot-section">
            <h4 className="item-lot-section-title">{t('itemTools.marketData')}</h4>
            <div className={actionsClass}>
              <Button size={btnSize} variant="secondary" onClick={() => void fetchAutoBuyPrice()}>{t('itemTools.fetchAutoBuyPrice')}</Button>
              <Button size={btnSize} variant="secondary" onClick={() => void fetchInventoryValue(false)}>{t('itemTools.fetchInvValue')}</Button>
              <Button size={btnSize} variant="secondary" onClick={() => void fetchInventoryValue(true)}>{t('itemTools.refreshInvValue')}</Button>
            </div>
            {(autoBuyPrice !== null || inventoryValue !== null) && (
              <div className="calc-result">
                {autoBuyPrice !== null && (
                  <div className="calc-result-item">
                    <span className="calc-result-label">{t('itemTools.autoBuyPrice')}</span>
                    <span className="calc-result-value">{autoBuyPrice} ₽</span>
                  </div>
                )}
                {inventoryValue !== null && (
                  <div className="calc-result-item">
                    <span className="calc-result-label">{t('itemTools.steamInvValue')}</span>
                    <span className="calc-result-value">{inventoryValue} ₽</span>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="item-lot-section">
            <h4 className="item-lot-section-title">{t('itemTools.noteTitle')}</h4>
            <Input label={t('itemTools.noteLabel')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('itemTools.notePlaceholder')} />
            <div className={actionsClass}>
              <Button size={btnSize} onClick={() => void saveNote()}>{t('common.save')}</Button>
              <Button size={btnSize} variant="secondary" onClick={() => void deleteNote()} disabled={!note}>{t('itemTools.deleteNote')}</Button>
            </div>
          </section>
          <section className="item-lot-section">
            <h4 className="item-lot-section-title">{t('itemTools.passwordTitle')}</h4>
            <Input
              label={t('itemTools.newPassword')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className={actionsClass}>
              <Button size={btnSize} variant="secondary" onClick={() => void changePassword()} disabled={!newPassword.trim()}>
                {t('itemTools.changePassword')}
              </Button>
            </div>
          </section>
        </>
      )}
      {status && <p className="form-status">{status}</p>}
    </div>
  )
}
