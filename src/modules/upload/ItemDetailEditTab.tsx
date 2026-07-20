import { useEffect, useState } from 'react'
import { Button } from '@components/Button'
import { Input, Select, Textarea } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import { UPLOAD_CURRENCIES, type MarketItemDetailResponse } from '@core/constants'
import { useOriginOptions, useTranslation } from '@core/i18n'
import { resolveItemPrice } from '@core/item-detail'
import { notify } from '@core/ui-store'

interface ItemDetailEditTabProps {
  itemId: number
  detail?: MarketItemDetailResponse
  onSaved: (itemId: number, price: number) => void
  onRefresh: () => Promise<void>
}

export function ItemDetailEditTab({
  itemId,
  detail,
  onSaved,
  onRefresh
}: ItemDetailEditTabProps): React.ReactNode {
  const { t } = useTranslation()
  const originOptions = useOriginOptions()
  const item = detail?.item
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('rub')
  const [description, setDescription] = useState('')
  const [information, setInformation] = useState('')
  const [origin, setOrigin] = useState('personal')
  const [emailType, setEmailType] = useState('')
  const [emailLoginData, setEmailLoginData] = useState('')
  const [allowAskDiscount, setAllowAskDiscount] = useState(false)
  const [proxyId, setProxyId] = useState('')
  const [autoBumpHour, setAutoBumpHour] = useState('')

  useEffect(() => {
    if (!item) return
    setTitle(item.title ?? '')
    setTitleEn(item.title_en ?? '')
    setPrice(String(resolveItemPrice(item) ?? ''))
    setCurrency(item.price_currency ?? 'rub')
    setDescription(item.description ?? '')
    setInformation(item.information ?? '')
    setOrigin(item.item_origin ?? 'personal')
    setEmailType(item.email_type ?? '')
    setEmailLoginData('')
    setAllowAskDiscount(Boolean(item.allow_ask_discount))
    setAutoBumpHour(item.auto_bump_period ? String(item.auto_bump_period) : '')
  }, [item])

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  async function saveListing(): Promise<void> {
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) return
    try {
      await getApiClient().editItem(itemId, {
        title: title.trim() || undefined,
        title_en: titleEn.trim() || undefined,
        price: priceNum,
        currency,
        description: description.trim() || undefined,
        information: information.trim() || undefined,
        item_origin: origin,
        email_type: emailType || undefined,
        email_login_data: emailLoginData.trim() || undefined,
        allow_ask_discount: allowAskDiscount,
        proxy_id: proxyId.trim() ? Number(proxyId) : undefined
      })
      onSaved(itemId, priceNum)
      setStatus(t('itemDetail.saved'))
      notify(t('upload.accountsTitle'), t('itemDetail.saved'), 'success')
      await onRefresh()
    } catch (e) {
      const msg = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(msg)
      notify(t('upload.accountsTitle'), msg, 'error')
    }
  }

  async function bump(): Promise<void> {
    try {
      await getApiClient().bumpItem(itemId)
      setStatus(t('upload.accountsBumped'))
      notify(t('upload.accountsTitle'), t('upload.accountsBumped'), 'success')
      await onRefresh()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function toggleOpen(open: boolean): Promise<void> {
    try {
      if (open) await getApiClient().openItem(itemId)
      else await getApiClient().closeItem(itemId)
      setStatus(open ? t('itemDetail.opened') : t('itemDetail.closed'))
      await onRefresh()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function fetchAiPrice(): Promise<void> {
    try {
      const { data } = await getApiClient().getAiPrice(itemId)
      const suggested = data.price
      if (suggested != null) {
        setPrice(String(suggested))
        setStatus(t('upload.aiPriceHint', { price: suggested }))
      }
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function setAutoBump(): Promise<void> {
    const hour = Number(autoBumpHour)
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return
    try {
      await getApiClient().autoBump(itemId, hour)
      setStatus(t('itemDetail.autoBumpSet'))
      await onRefresh()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function disableAutoBump(): Promise<void> {
    try {
      await getApiClient().disableAutoBump(itemId)
      setAutoBumpHour('')
      setStatus(t('itemDetail.autoBumpDisabled'))
      await onRefresh()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  async function deleteListing(): Promise<void> {
    if (!window.confirm(t('itemDetail.deleteConfirm'))) return
    try {
      await getApiClient().deleteItem(itemId)
      setStatus(t('itemDetail.deleted'))
      notify(t('upload.accountsTitle'), t('itemDetail.deleted'), 'success')
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  const canEdit = detail?.canEditItem ?? item?.canEditItem ?? true
  const canOpen = detail?.canOpenItem ?? item?.canOpenItem
  const canClose = detail?.canCloseItem ?? item?.canCloseItem
  const canBump = detail?.canBumpItem ?? item?.canBumpItem
  const canDelete = detail?.canDeleteItem ?? item?.canDeleteItem
  const canAutoBump = item?.canAutoBump

  const currencyOptions = UPLOAD_CURRENCIES.map((c) => ({ value: c, label: c.toUpperCase() }))

  return (
    <div className="lot-modal-tab-pane lot-edit-tab">
      <div className="lot-modal-grid">
        <div className="lot-modal-col lot-modal-col-main">
          <section className="lot-modal-panel">
            <h3 className="lot-modal-panel-title">{t('itemDetail.editListing')}</h3>
            <div className="lot-edit-form">
              <Input label={t('itemDetail.titleRu')} value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input label={t('itemDetail.titleEn')} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
              <div className="form-row-2">
                <Input
                  label={t('upload.newPrice')}
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Select
                  label={t('upload.currency')}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={currencyOptions}
                />
              </div>
              <Select
                label={t('upload.itemOrigin')}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                options={originOptions}
              />
            </div>
          </section>

          <section className="lot-modal-panel">
            <h3 className="lot-modal-panel-title">{t('upload.description')}</h3>
            <div className="lot-edit-form">
              <Textarea
                label={t('upload.description')}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Textarea
                label={t('upload.information')}
                rows={3}
                value={information}
                onChange={(e) => setInformation(e.target.value)}
              />
            </div>
          </section>

          <section className="lot-modal-panel">
            <h3 className="lot-modal-panel-title">{t('itemDetail.extraSettings')}</h3>
            <div className="lot-edit-form">
              <div className="form-row-2">
                <Select
                  label={t('upload.emailType')}
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  options={[
                    { value: '', label: t('upload.emailType.default') },
                    { value: 'native', label: t('upload.emailType.native') },
                    { value: 'autoreg', label: t('upload.emailType.autoreg') }
                  ]}
                />
                <Input
                  label={t('itemDetail.emailLoginData')}
                  value={emailLoginData}
                  onChange={(e) => setEmailLoginData(e.target.value)}
                  placeholder="email:password"
                />
              </div>
              <Input
                label={t('upload.proxyId')}
                type="number"
                value={proxyId}
                onChange={(e) => setProxyId(e.target.value)}
                placeholder={t('upload.proxyDefault')}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={allowAskDiscount}
                  onChange={(e) => setAllowAskDiscount(e.target.checked)}
                />
                {t('upload.allowAskDiscount')}
              </label>
            </div>
          </section>
        </div>

        <aside className="lot-modal-col lot-modal-col-side lot-edit-sidebar">
          <section className="lot-modal-panel lot-modal-panel-accent">
            <h3 className="lot-modal-panel-title">{t('common.save')}</h3>
            <div className="lot-side-actions">
              <Button onClick={() => void run(saveListing)} disabled={!canEdit || busy || !price}>
                {t('common.save')}
              </Button>
              <Button variant="secondary" onClick={() => void run(fetchAiPrice)} disabled={busy}>
                {t('upload.aiPriceFetch')}
              </Button>
            </div>
          </section>

          <section className="lot-modal-panel">
            <h3 className="lot-modal-panel-title">{t('upload.accountsMarketActions')}</h3>
            <div className="lot-side-actions">
              {canOpen && (
                <Button variant="secondary" onClick={() => void run(() => toggleOpen(true))} disabled={busy}>
                  {t('itemDetail.openListing')}
                </Button>
              )}
              {canClose && (
                <Button variant="secondary" onClick={() => void run(() => toggleOpen(false))} disabled={busy}>
                  {t('itemDetail.closeListing')}
                </Button>
              )}
              {canBump && (
                <Button variant="secondary" onClick={() => void run(bump)} disabled={busy}>
                  {t('upload.accountsBump')}
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" onClick={() => void run(deleteListing)} disabled={busy}>
                  {t('itemDetail.deleteListing')}
                </Button>
              )}
            </div>
          </section>

          {canAutoBump && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemDetail.autoBump')}</h3>
              <div className="lot-edit-form">
                <Input
                  label={t('itemDetail.autoBumpHour')}
                  type="number"
                  min={0}
                  max={23}
                  value={autoBumpHour}
                  onChange={(e) => setAutoBumpHour(e.target.value)}
                  hint={t('itemDetail.autoBumpHourHint')}
                />
                <div className="lot-side-actions">
                  <Button onClick={() => void run(setAutoBump)} disabled={busy || autoBumpHour === ''}>
                    {t('itemDetail.enableAutoBump')}
                  </Button>
                  <Button variant="ghost" onClick={() => void run(disableAutoBump)} disabled={busy}>
                    {t('itemDetail.disableAutoBump')}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {status && <p className="lot-modal-status">{status}</p>}
        </aside>
      </div>
    </div>
  )
}
