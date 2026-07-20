import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { LayoutTemplate, ListOrdered, PackagePlus, Pause, Play, Rocket, Settings2, ShieldCheck, SlidersHorizontal, Type, Zap } from 'lucide-react'
import { UploadModals, type UploadModalId } from './UploadModals'
import { useUploadedAccountsTab } from './UploadedAccountsTab'
import { useUploadHistoryTab } from './UploadHistoryTab'
import { UploadQueueTab, type UploadQueueRow } from './UploadQueueTab'
import { getCategoryVisual } from './category-visuals'
import { Input, Select, Textarea } from '@components/FormFields'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { getApiClient, LztApiError } from '@core/api-client'
import { autoLogDeal, resolveParentDeal } from '@core/deal-auto-log'
import { encryptUploadPayload } from '@core/market-encrypt'
import type { FastSellPayload, GoodsCheckPayload } from '@core/constants'
import { CATEGORY_ID_MAP, type MarketProxy } from '@core/constants'
import { validateUploadCsv, type CsvPreflightResult } from '@core/csv-preflight'
import { downloadCsv, toCsv } from '@core/export-csv'
import { msUntilUploadWindow, parseUploadWindow } from '@core/upload-window'
import { BUILTIN_UPLOAD_TEMPLATES, applyPriceFormula } from '@core/upload-templates'
import {
  buildExtraFromRow,
  buildFastSellPayload,
  buildGoodsCheckPayload,
  buildItemAddPayload,
  CURRENCY_OPTIONS,
  getCategoryUploadRequirements,
  getCsvTemplateForCategory,
  isOriginAllowedForCategory,
  parseCsvHeader,
  parseCsvRowValues,
  parseMafileJson,
  parsedValuesToRow,
  STEAM_CATEGORY_ID
} from '@core/upload-requirements'
import { useCategoryOptions, useOriginOptions, useTranslation, type TranslationKey } from '@core/i18n'
import { UPLOAD_STATUS } from '@core/upload-status'
import { notify } from '@core/ui-store'

type UploadRow = UploadQueueRow & {
  password: string
  emailLogin?: string
  cookies?: string
  proxy?: string
  tfaSecret?: string
  title?: string
  titleEn?: string
  mafile?: string
  resellItemId?: number
}

type UploadTab = 'upload' | 'queue' | 'history' | 'accounts'
type PublishMode = 'fast-sell' | 'item-add'

const UPLOAD_TABS = ['upload', 'queue', 'accounts', 'history'] as const
const FORCE_TEMP_EMAIL_CATEGORIES = new Set(['fortnite', 'epicgames', 'supercell'])

function proxyLabel(p: MarketProxy): string {
  const id = p.proxy_id ?? p.id ?? '?'
  const host = p.proxy_ip ?? p.host ?? '?'
  const port = p.proxy_port ?? p.port ?? '?'
  return `#${id} ${host}:${port}`
}

function resolveUploadLogin(row: UploadRow): string {
  return (row.login || row.loginPassword?.split(':')[0] || '').trim()
}

export function UploadPage(): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()
  const allOriginOptions = useOriginOptions()
  const [tab, setTab] = useQueryTab<UploadTab>('tab', 'upload', UPLOAD_TABS)
  const [category, setCategory] = useState('steam')
  const [currency, setCurrency] = useState('rub')
  const [price, setPrice] = useState('500')
  const [origin, setOrigin] = useState('personal')
  const [defaultTitle, setDefaultTitle] = useState('')
  const [defaultTitleEn, setDefaultTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [information, setInformation] = useState('')
  const [guaranteeDuration, setGuaranteeDuration] = useState('')
  const [emailType, setEmailType] = useState('')
  const [resellItemId, setResellItemId] = useState('')
  const [proxyId, setProxyId] = useState('')
  const [randomProxy, setRandomProxy] = useState(false)
  const [allowAskDiscount, setAllowAskDiscount] = useState(false)
  const [uploadMafileAfterSell, setUploadMafileAfterSell] = useState(true)
  const [autoGenerateTitle, setAutoGenerateTitle] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [csvText, setCsvText] = useState('login,password\n')
  const [queue, setQueue] = useState<UploadRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [bulkItemIds, setBulkItemIds] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [preflightMsg, setPreflightMsg] = useState<string | null>(null)
  const [preflightResult, setPreflightResult] = useState<CsvPreflightResult | null>(null)
  const [uploadWindowEnabled, setUploadWindowEnabled] = useState(false)
  const [uploadWindowStart, setUploadWindowStart] = useState('9')
  const [uploadWindowEnd, setUploadWindowEnd] = useState('22')
  const [publishMode, setPublishMode] = useState<PublishMode>('fast-sell')
  const [forceTempEmail, setForceTempEmail] = useState(false)
  const [autoCheckAfterAdd, setAutoCheckAfterAdd] = useState(true)
  const [aiPriceHint, setAiPriceHint] = useState<number | null>(null)
  const [aiPriceLoading, setAiPriceLoading] = useState(false)
  const [proxyOptions, setProxyOptions] = useState<Array<{ value: string; label: string }>>([
    { value: '', label: '—' }
  ])
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [activeModal, setActiveModal] = useState<UploadModalId | null>(null)

  const requirements = useMemo(() => getCategoryUploadRequirements(category), [category])
  const categoryId = CATEGORY_ID_MAP[category] ?? 1
  const isSteam = categoryId === STEAM_CATEGORY_ID
  const supportsForceTempEmail = FORCE_TEMP_EMAIL_CATEGORIES.has(category)

  const originOptions = useMemo(
    () =>
      allOriginOptions.filter((o) => {
        const restricted = ['dummy', 'self_registration', 'retrieve_via_support']
        if (!restricted.includes(o.value)) return true
        return isOriginAllowedForCategory(o.value, categoryId)
      }),
    [allOriginOptions, categoryId]
  )

  useEffect(() => {
    if (!isOriginAllowedForCategory(origin, categoryId)) {
      setOrigin('personal')
    }
  }, [categoryId, origin])

  useEffect(() => {
    void Promise.all([
      window.api.db.getSetting('upload_window_enabled'),
      window.api.db.getSetting('upload_window_start'),
      window.api.db.getSetting('upload_window_end')
    ]).then(([enabled, start, end]) => {
      setUploadWindowEnabled(enabled === '1')
      if (start) setUploadWindowStart(start)
      if (end) setUploadWindowEnd(end)
    })
  }, [])

  useEffect(() => {
    void getApiClient()
      .getProxies<{ proxies?: MarketProxy[] } | MarketProxy[]>()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.proxies ?? [])
        setProxyOptions([
          { value: '', label: t('upload.proxyDefault') },
          ...list.map((p) => ({
            value: String(p.proxy_id ?? p.id ?? ''),
            label: proxyLabel(p)
          }))
        ])
      })
      .catch(() => {
        setProxyOptions([{ value: '', label: t('upload.proxyDefault') }])
      })
  }, [t])

  function parseCsv(): UploadRow[] {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []
    const columns = parseCsvHeader(lines[0])
    const formResellId = resellItemId.trim() ? Number(resellItemId) : undefined
    const defaultPrice = Number(price) || 1

    return lines
      .slice(1)
      .map((line, index) => {
        const values = parseCsvRowValues(line, columns)
        const parsed = parsedValuesToRow(values)
        const dedupeKey = parsed.login || parsed.loginPassword || `${index}`
        return {
          id: `${index}-${dedupeKey}`,
          login: parsed.login,
          password: parsed.password,
          loginPassword: parsed.loginPassword,
          emailLogin: parsed.emailLogin,
          cookies: parsed.cookies,
          proxy: parsed.proxy,
          tfaSecret: parsed.tfaSecret,
          title: parsed.title,
          titleEn: parsed.titleEn,
          price: parsed.price ?? defaultPrice,
          mafile: parsed.mafile,
          resellItemId:
            parsed.resellItemId ??
            (formResellId && !Number.isNaN(formResellId) ? formResellId : undefined),
          status: 'pending' as const
        }
      })
      .filter((row) => row.loginPassword || (row.login && row.password))
  }

  function handleQueue(): void {
    const parsed = parseCsv()
    setQueue(parsed)
    setTab('queue')
    void window.api.db.logActivity('upload', 'queue_parsed', `${parsed.length} accounts`)
  }

  async function runPreflight(): Promise<void> {
    const rows = parseCsv()
    const dupes = await window.api.db.checkDuplicatesBatch(rows.map((r) => r.login).filter(Boolean))
    const result = validateUploadCsv(csvText, new Set(dupes), category)
    setPreflightResult(result)
    if (result.valid) {
      setPreflightMsg(t('upload.preflightOk', { ok: result.summary.ok, total: result.summary.total }))
    } else {
      setPreflightMsg(
        `${t('upload.preflightOk', { ok: result.summary.ok, total: result.summary.total })} · ${t('upload.preflightErrors', { count: result.summary.errors })}`
      )
    }
    setActiveModal('preflight')
  }

  async function saveUploadWindowSettings(): Promise<void> {
    await window.api.db.setSetting('upload_window_enabled', uploadWindowEnabled ? '1' : '0')
    await window.api.db.setSetting('upload_window_start', uploadWindowStart)
    await window.api.db.setSetting('upload_window_end', uploadWindowEnd)
  }

  async function fetchAiPriceForResell(): Promise<void> {
    const id = Number(resellItemId)
    if (!id) return
    setAiPriceLoading(true)
    try {
      const { data } = await getApiClient().getAiPrice(id)
      const suggested = data.price ?? null
      setAiPriceHint(suggested)
      if (suggested) setPrice(String(suggested))
    } catch (e) {
      notify(t('upload.aiPriceTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    } finally {
      setAiPriceLoading(false)
    }
  }

  function applyTemplate(templateId: string): void {
    const tpl = BUILTIN_UPLOAD_TEMPLATES.find((x) => x.id === templateId)
    if (!tpl) return
    setCategory(tpl.category)
    setOrigin(tpl.origin)
    setPrice(String(applyPriceFormula(tpl.priceFormula)))
    if (tpl.titleTemplate) setDefaultTitle(tpl.titleTemplate)
    setCsvText(getCsvTemplateForCategory(tpl.category))
  }

  function applyCategoryCsvTemplate(): void {
    setCsvText(getCsvTemplateForCategory(category))
  }

  async function runUpload(): Promise<void> {
    if (queue.length === 0) return
    setUploading(true)
    pausedRef.current = false
    setPaused(false)
    const client = getApiClient()
    const defaultPrice = Number(price) || 1
    const formResellId = resellItemId.trim() ? Number(resellItemId) : undefined

    const windowConfig = parseUploadWindow(
      uploadWindowEnabled ? '1' : '0',
      uploadWindowStart,
      uploadWindowEnd
    )

    const next = [...queue]
    for (let i = 0; i < next.length; i++) {
      while (pausedRef.current) {
        await sleep(400)
      }

      const waitMs = msUntilUploadWindow(windowConfig)
      if (waitMs > 0) {
        setPreflightMsg(t('upload.waitingForWindow', { minutes: Math.ceil(waitMs / 60_000) }))
        await sleep(Math.min(waitMs, 60_000))
        i--
        continue
      }

      const row = next[i]
      if (row.status === 'success') continue

      if (skipDuplicates && row.login) {
        const dup = await window.api.db.checkDuplicateLogin(row.login)
        if (dup) {
          next[i] = { ...row, status: 'skipped', message: t('upload.duplicateLogin') }
          await window.api.db.addUploadHistory({
            login: resolveUploadLogin(row),
            category,
            status: UPLOAD_STATUS.skipped,
            message: t('upload.duplicateLogin')
          })
          setQueue([...next])
          continue
        }
      }

      if (requirements.requiresEmailLogin && !row.emailLogin) {
        const msg = t('upload.errorMissingEmail')
        next[i] = { ...row, status: 'error', message: msg }
        await window.api.db.addUploadHistory({
          login: resolveUploadLogin(row),
          category,
          status: UPLOAD_STATUS.error,
          message: msg
        })
        setQueue([...next])
        continue
      }

      next[i] = { ...row, status: 'processing' }
      setQueue([...next])

      const priceNum = row.price ?? defaultPrice
      const title = row.title || defaultTitle || undefined
      const titleEn = row.titleEn || defaultTitleEn || undefined
      const extra = buildExtraFromRow(row)
      const effectiveResellId =
        row.resellItemId ??
        (formResellId && !Number.isNaN(formResellId) ? formResellId : undefined)

      let rateLimit: import('@core/constants').RateLimitInfo | undefined

      try {
        const payloadInput = {
          row: {
            login: row.login,
            password: row.password,
            loginPassword: row.loginPassword,
            emailLogin: row.emailLogin,
            cookies: row.cookies,
            proxy: row.proxy,
            tfaSecret: row.tfaSecret,
            title: row.title,
            titleEn: row.titleEn,
            price: row.price,
            mafile: row.mafile,
            resellItemId: row.resellItemId
          },
          categoryId,
          form: {
            currency,
            origin,
            defaultTitle,
            defaultTitleEn,
            autoGenerateTitle,
            description,
            information,
            guaranteeDuration,
            allowAskDiscount,
            resellItemId,
            proxyId,
            randomProxy,
            forceTempEmail,
            emailType
          },
          priceNum,
          title,
          titleEn,
          effectiveResellId,
          extra
        }

        let data: { item?: { item_id?: number }; item_id?: number }

        if (publishMode === 'item-add') {
          const addPayload = buildItemAddPayload(payloadInput)
          const { extraParams: addExtra } = await encryptUploadPayload(addPayload as FastSellPayload)
          const addRes = await client.itemAdd(addPayload, addExtra)
          data = addRes.data
          rateLimit = addRes.rateLimit
          const itemIdFromAdd = data.item?.item_id ?? data.item_id

          if (autoCheckAfterAdd && itemIdFromAdd) {
            if (!row.loginPassword && !(row.login && row.password)) {
              throw new LztApiError(t('upload.preflight.missingCredentials'), 400)
            }
            await client.getItemAddGoods(itemIdFromAdd)
            const checkPayload = buildGoodsCheckPayload(payloadInput)
            const { body: checkBody, extraParams: checkExtra } = await encryptUploadPayload(checkPayload as FastSellPayload)
            const checkRes = await client.checkItemGoods(itemIdFromAdd, checkBody as GoodsCheckPayload, checkExtra)
            data = checkRes.data as typeof data
            rateLimit = checkRes.rateLimit ?? rateLimit
          }
        } else {
          const sellPayload = buildFastSellPayload(payloadInput)
          const { body: encryptedBody, extraParams } = await encryptUploadPayload(sellPayload)
          const sellRes = await client.fastSell<{ item?: { item_id?: number }; item_id?: number }>(
            encryptedBody as unknown as FastSellPayload,
            extraParams
          )
          data = sellRes.data
          rateLimit = sellRes.rateLimit
        }

        let itemId = data.item?.item_id ?? data.item_id
        let message = itemId ? `ID ${itemId}` : t('upload.uploaded')

        if (itemId && isSteam && row.mafile && uploadMafileAfterSell && publishMode === 'fast-sell') {
          try {
            await client.addMafile(itemId, parseMafileJson(row.mafile))
            message = `${message} · mafile`
          } catch (mafileErr) {
            const mafileMsg = mafileErr instanceof LztApiError ? mafileErr.message : t('upload.mafileFailed')
            message = `${message} · ${mafileMsg}`
          }
        }

        next[i] = { ...row, status: 'success', itemId, message }
        await window.api.db.addUploadHistory({
          login: resolveUploadLogin(row),
          item_id: itemId,
          category,
          status: UPLOAD_STATUS.success,
          message,
          initial_price: priceNum,
          current_price: priceNum
        })
        if (itemId) await window.api.db.trackListing(itemId, priceNum)
        if (itemId) {
          const parent = effectiveResellId ? await resolveParentDeal(effectiveResellId) : {}
          await autoLogDeal({
            action: 'resell',
            item_id: itemId,
            category,
            buy_price: parent.buy_price,
            sell_price: priceNum,
            source: 'upload',
            parent_deal_id: parent.parent_deal_id,
            notes: title ?? resolveUploadLogin(row)
          })
        }
      } catch (e) {
        const msg = e instanceof LztApiError ? e.message : t('common.error')
        next[i] = { ...row, status: 'error', message: msg }
        await window.api.db.addUploadHistory({
          login: resolveUploadLogin(row),
          category,
          status: UPLOAD_STATUS.error,
          message: msg
        })
      }
      setQueue([...next])
      if (rateLimit && rateLimit.remaining <= 1) {
        const wait = Math.max(rateLimit.reset * 1000 - Date.now(), 2_000)
        await sleep(wait)
      } else {
        await sleep(500)
      }
    }

    setUploading(false)
    setPreflightMsg(null)
    setHistoryRefreshKey((k) => k + 1)
    const okCount = next.filter((r) => r.status === 'success').length
    await window.api.db.logActivity('upload', 'batch_complete', `${okCount} ok`)
    void window.api.webhook.fire('upload_complete', {
      category,
      total: next.length,
      success: okCount,
      errors: next.filter((r) => r.status === 'error').length
    })
  }

  async function applyBulkPrice(): Promise<void> {
    const ids = bulkItemIds
      ? bulkItemIds.split(/[,\s]+/).map(Number).filter(Boolean)
      : queue.filter((r) => r.itemId).map((r) => r.itemId!)
    if (!ids.length || !bulkPrice) return

    try {
      await getApiClient().bulkAction({
        action: 'edit-price',
        item_ids: ids,
        price: bulkPrice,
        currency
      })
      notify(
        t('upload.bulkPriceTitle'),
        t('upload.bulkEditOk', { price: bulkPrice, count: ids.length }),
        'success'
      )
      await window.api.db.logActivity('upload', 'bulk_price', `${ids.length} items → ${bulkPrice}`)
    } catch (e) {
      notify(
        t('upload.bulkEditFailed'),
        e instanceof LztApiError ? e.message : t('common.error'),
        'error'
      )
    }
  }

  function exportHistory(): void {
    void window.api.db.getUploadHistory().then((rows) => {
      downloadCsv(
        'upload-history.csv',
        toCsv(
          rows.map((row) => ({
            login: row.login,
            status: row.status,
            item_id: row.item_id,
            category: row.category,
            message: row.message,
            created_at: row.created_at
          })),
          ['login', 'status', 'item_id', 'category', 'message', 'created_at']
        )
      )
    })
  }

  const historyTab = useUploadHistoryTab(historyRefreshKey)
  const accountsTab = useUploadedAccountsTab(historyRefreshKey, () => setTab('upload'))
  const currencyLabel = currency.toUpperCase()
  const categoryVisual = getCategoryVisual(category)
  const csvLineCount = useMemo(() => {
    const lines = csvText.trim().split('\n').filter(Boolean)
    return Math.max(0, lines.length - 1)
  }, [csvText])

  const pageMeta = useMemo(() => {
    switch (tab) {
      case 'accounts':
        return {
          title: t('upload.accountsTitle'),
          subtitle: t('upload.accountsDesc'),
          badge: accountsTab.accountCount > 0
            ? `${accountsTab.successCount}/${accountsTab.accountCount}`
            : undefined
        }
      case 'queue':
        return {
          title: t('upload.queueTitle'),
          subtitle: t('upload.queueDesc'),
          badge: queue.length > 0 ? t('upload.accountsCount', { count: queue.length }) : undefined
        }
      case 'history':
        return {
          title: t('upload.historyTitle'),
          subtitle: t('upload.historyDesc'),
          badge: historyTab.recordCount > 0 ? `${historyTab.recordCount} ${t('common.records')}` : undefined
        }
      default:
        return {
          title: t('upload.title'),
          subtitle: publishMode === 'item-add' ? t('upload.subtitleItemAdd') : t('upload.subtitleFastSell'),
          badge: `${publishMode === 'item-add' ? t('upload.modeItemAddShort') : t('upload.modeFastSellShort')} · ${categoryVisual.label} · ${price} ${currencyLabel}`
        }
    }
  }, [tab, t, accountsTab.accountCount, accountsTab.successCount, queue.length, historyTab.recordCount, category, price, currencyLabel, publishMode, categoryVisual.label])

  const uploadMain = (
    <div className="upload-studio">
      <div className="upload-studio-modes">
        <button
          type="button"
          className={clsx('upload-studio-mode', publishMode === 'fast-sell' && 'active')}
          onClick={() => setPublishMode('fast-sell')}
        >
          <Zap size={16} />
          {t('upload.modeFastSell')}
        </button>
        <button
          type="button"
          className={clsx('upload-studio-mode', publishMode === 'item-add' && 'active')}
          onClick={() => setPublishMode('item-add')}
        >
          <PackagePlus size={16} />
          {t('upload.modeItemAdd')}
        </button>
      </div>

      <div className="upload-studio-card">
        {publishMode === 'fast-sell' ? (
          <div className="upload-studio-flow-step is-active upload-studio-flow-step-compact">
            <span className="upload-studio-flow-num">1</span>
            <div className="upload-studio-flow-text">
              <strong>{t('upload.flowFastSellTitle')}</strong>
              <span>{t('upload.flowFastSellDesc')}</span>
            </div>
          </div>
        ) : (
          <div className="upload-studio-flow-full">
            <div className="upload-studio-flow-step is-active">
              <span className="upload-studio-flow-num">1</span>
              <div className="upload-studio-flow-text">
                <strong>{t('upload.flowStepAdd')}</strong>
                <span>{t('upload.flowStepAddDesc')}</span>
              </div>
            </div>
            <div className="upload-studio-flow-step">
              <span className="upload-studio-flow-num">2</span>
              <div className="upload-studio-flow-text">
                <strong>{t('upload.flowStepGoodsAdd')}</strong>
                <span>{t('upload.flowStepGoodsAddDesc')}</span>
              </div>
            </div>
            <div className="upload-studio-flow-step">
              <span className="upload-studio-flow-num">3</span>
              <div className="upload-studio-flow-text">
                <strong>{t('upload.flowStepCheck')}</strong>
                <span>{t('upload.flowStepCheckDesc')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="upload-studio-form">
          <div className="upload-studio-form-row upload-studio-form-row-toolbar">
            <Select
              label={t('common.category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
            <div className="upload-studio-tools">
              <button type="button" className="upload-studio-tool" onClick={() => setActiveModal('templates')}>
                <LayoutTemplate size={15} />
                {t('upload.openTemplates')}
              </button>
              {publishMode === 'fast-sell' && (
                <button type="button" className="upload-studio-tool" onClick={() => setActiveModal('content')}>
                  <Type size={15} />
                  {t('upload.openContent')}
                </button>
              )}
              <button type="button" className="upload-studio-tool" onClick={() => setActiveModal('settings')}>
                <Settings2 size={15} />
                {t('upload.openSettings')}
              </button>
              <button type="button" className="upload-studio-tool" onClick={() => setActiveModal('tools')}>
                <SlidersHorizontal size={15} />
                {t('upload.openTools')}
              </button>
            </div>
          </div>

          <div className="upload-studio-form-row">
            <Select label={t('upload.currency')} value={currency} onChange={(e) => setCurrency(e.target.value)} options={CURRENCY_OPTIONS} />
            <Select label={t('upload.itemOrigin')} value={origin} onChange={(e) => setOrigin(e.target.value)} options={originOptions} />
            <Input label={t('upload.defaultPrice')} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        {publishMode === 'item-add' && (
          <div className="upload-studio-lot">
            <h4>{t('upload.sectionContent')}</h4>
            <p className="upload-studio-lot-desc">{t('upload.itemAddLotDesc')}</p>
            <div className="upload-studio-form-row">
              <Input label={t('upload.defaultTitle')} value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} placeholder={t('upload.defaultTitlePlaceholder')} />
              <Input label={t('upload.defaultTitleEn')} value={defaultTitleEn} onChange={(e) => setDefaultTitleEn(e.target.value)} placeholder={t('upload.defaultTitleEnPlaceholder')} />
              <div className="upload-studio-form-spacer" aria-hidden />
            </div>
            <label className="checkbox-row upload-studio-checkbox">
              <input type="checkbox" checked={autoGenerateTitle} onChange={(e) => setAutoGenerateTitle(e.target.checked)} />
              {t('upload.autoGenerateTitle')}
            </label>
            <Textarea label={t('upload.description')} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="upload-studio-lot-options">
              {supportsForceTempEmail && (
                <label className="checkbox-row">
                  <input type="checkbox" checked={forceTempEmail} onChange={(e) => setForceTempEmail(e.target.checked)} />
                  {t('upload.forceTempEmail')}
                </label>
              )}
              <label className="checkbox-row">
                <input type="checkbox" checked={autoCheckAfterAdd} onChange={(e) => setAutoCheckAfterAdd(e.target.checked)} />
                {t('upload.autoCheckAfterAdd')}
              </label>
            </div>
          </div>
        )}

        <p className="upload-studio-hint">
          {publishMode === 'item-add' ? t('upload.hint.itemAddCheck') : t(requirements.hintKey as TranslationKey)}
        </p>

        <div className="upload-studio-csv">
          <div className="upload-studio-csv-head">
            <span>{publishMode === 'item-add' ? t('upload.csvCredentialsCheck') : t('upload.csvData')}</span>
            <button type="button" className="upload-studio-link" onClick={applyCategoryCsvTemplate}>
              {t('upload.resetCsvTemplate')}
            </button>
          </div>
          <Textarea
            rows={publishMode === 'item-add' ? 12 : 14}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="upload-studio-csv-input"
          />
        </div>
      </div>

      <div className="upload-studio-dock">
        <div className="upload-studio-dock-meta">
          <span>{t('upload.csvData')}: <strong>{csvLineCount}</strong></span>
          <span>{t('upload.queueTitle')}: <strong>{queue.length}</strong></span>
          {preflightMsg && !activeModal && (
            <span className="upload-studio-dock-status">{preflightMsg}</span>
          )}
        </div>
        <div className="upload-studio-dock-actions">
          <button type="button" className="upload-studio-btn" onClick={() => void runPreflight()}>
            <ShieldCheck size={16} />
            {t('upload.preflightRun')}
          </button>
          <button type="button" className="upload-studio-btn" onClick={handleQueue}>
            <ListOrdered size={16} />
            {t('upload.parseQueue')}
          </button>
          <button
            type="button"
            className="upload-studio-btn upload-studio-btn-primary"
            onClick={() => void runUpload()}
            disabled={uploading || queue.length === 0}
          >
            <Rocket size={16} />
            {uploading ? t('upload.uploading') : t('upload.startUpload')}
          </button>
          {uploading && (
            <button
              type="button"
              className="upload-studio-btn upload-studio-btn-ghost"
              onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current) }}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
        </div>
      </div>

      <UploadModals
        active={activeModal}
        onClose={() => setActiveModal(null)}
        publishMode={publishMode}
        isSteam={isSteam}
        supportsForceTempEmail={supportsForceTempEmail}
        requirements={requirements}
        proxyOptions={proxyOptions}
        preflightMsg={preflightMsg}
        preflightResult={preflightResult}
        guaranteeDuration={guaranteeDuration}
        setGuaranteeDuration={setGuaranteeDuration}
        emailType={emailType}
        setEmailType={setEmailType}
        resellItemId={resellItemId}
        setResellItemId={setResellItemId}
        aiPriceLoading={aiPriceLoading}
        aiPriceHint={aiPriceHint}
        onFetchAiPrice={() => void fetchAiPriceForResell()}
        forceTempEmail={forceTempEmail}
        setForceTempEmail={setForceTempEmail}
        autoCheckAfterAdd={autoCheckAfterAdd}
        setAutoCheckAfterAdd={setAutoCheckAfterAdd}
        allowAskDiscount={allowAskDiscount}
        setAllowAskDiscount={setAllowAskDiscount}
        uploadMafileAfterSell={uploadMafileAfterSell}
        setUploadMafileAfterSell={setUploadMafileAfterSell}
        skipDuplicates={skipDuplicates}
        setSkipDuplicates={setSkipDuplicates}
        proxyId={proxyId}
        setProxyId={setProxyId}
        randomProxy={randomProxy}
        setRandomProxy={setRandomProxy}
        uploadWindowEnabled={uploadWindowEnabled}
        setUploadWindowEnabled={setUploadWindowEnabled}
        uploadWindowStart={uploadWindowStart}
        setUploadWindowStart={setUploadWindowStart}
        uploadWindowEnd={uploadWindowEnd}
        setUploadWindowEnd={setUploadWindowEnd}
        onSaveUploadWindow={() => void saveUploadWindowSettings()}
        defaultTitle={defaultTitle}
        setDefaultTitle={setDefaultTitle}
        defaultTitleEn={defaultTitleEn}
        setDefaultTitleEn={setDefaultTitleEn}
        autoGenerateTitle={autoGenerateTitle}
        setAutoGenerateTitle={setAutoGenerateTitle}
        description={description}
        setDescription={setDescription}
        information={information}
        setInformation={setInformation}
        bulkItemIds={bulkItemIds}
        setBulkItemIds={setBulkItemIds}
        bulkPrice={bulkPrice}
        setBulkPrice={setBulkPrice}
        onApplyBulkPrice={() => void applyBulkPrice()}
        onExportHistory={exportHistory}
        onApplyTemplate={applyTemplate}
        category={category}
      />
    </div>
  )

  const queueMain = (
    <UploadQueueTab
      queue={queue}
      defaultPrice={price}
      currencyLabel={currencyLabel}
      uploading={uploading}
      paused={paused}
      onStartUpload={() => void runUpload()}
      onTogglePause={() => {
        pausedRef.current = !pausedRef.current
        setPaused(pausedRef.current)
      }}
      onGoToUpload={() => setTab('upload')}
    />
  )

  const historyMain = historyTab.main

  return (
    <PageLayout
      title={pageMeta.title}
      subtitle={pageMeta.subtitle}
      badge={pageMeta.badge}
      main={
        tab === 'upload'
          ? uploadMain
          : tab === 'queue'
            ? queueMain
            : tab === 'accounts'
              ? accountsTab.main
              : historyMain
      }
      aside={tab === 'accounts' ? accountsTab.aside : undefined}
      fullHeight={tab === 'accounts'}
    />
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
