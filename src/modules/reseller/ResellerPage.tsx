import { useEffect, useMemo, useState } from 'react'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { ResellerClaimsTab } from './ResellerClaimsTab'
import { getApiClient, LztApiError } from '@core/api-client'
import { toCsv } from '@core/export-csv'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import { buildDealChains, buildPlReport, filterDealsByPeriod, type PlPeriod } from '@core/pl-report'
import { calcDealMargin, formatDealRoi } from '@core/deal-margin'
import {
  getDefaultFeePercent,
  isAutoDealEnabled,
  setAutoDealEnabled,
  setDefaultFeePercent
} from '@core/deal-auto-log'
import { downloadPlReport } from '@core/pl-export'
import type { Deal } from '@renderer/types/database'
import { ResellerInsightsPanel } from './ResellerInsightsPanel'
import { ResellerJournalTab } from './ResellerJournalTab'
import { ResellerMarginModal } from './ResellerMarginModal'
import { ResellerStatsRow } from './ResellerStatsRow'
import { ResellerTransferTab } from './ResellerTransferTab'

type ResellerTab = 'journal' | 'transfer' | 'claims'

const RESELLER_TABS = ['journal', 'transfer', 'claims'] as const

export function ResellerPage(): React.ReactNode {
  const { t } = useTranslation()
  const [tab] = useQueryTab<ResellerTab>('tab', 'journal', RESELLER_TABS)
  const [deals, setDeals] = useState<Deal[]>([])
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [feePercent, setFeePercent] = useState('5')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('steam')
  const [itemId, setItemId] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [secretAnswer, setSecretAnswer] = useState('')
  const [dealSource, setDealSource] = useState('flip')
  const [plPeriod, setPlPeriod] = useState<PlPeriod>('month')
  const [exportPick, setExportPick] = useState('')
  const [parentDealId, setParentDealId] = useState('')
  const [aiPriceHint, setAiPriceHint] = useState<number | null>(null)
  const [guaranteeCheck, setGuaranteeCheck] = useState<string | null>(null)
  const [autoDealEnabled, setAutoDealEnabledState] = useState(true)
  const [marginModalOpen, setMarginModalOpen] = useState(false)

  useEffect(() => {
    void refreshDeals()
    void window.api.db.getSetting('market_secret_answer').then((v) => {
      if (v) setSecretAnswer(v)
    })
    void isAutoDealEnabled().then(setAutoDealEnabledState)
    void getDefaultFeePercent().then((fee) => setFeePercent(String(fee)))
  }, [])

  useEffect(() => {
    if (tab !== 'transfer') return
    void window.api.db.getSetting('market_secret_answer').then((v) => {
      setSecretAnswer(v ?? '')
    })
  }, [tab])

  async function refreshDeals(): Promise<void> {
    setDeals(await window.api.db.getDeals())
  }

  const buy = Number(buyPrice) || 0
  const sell = Number(sellPrice) || 0
  const fee = Number(feePercent) || 0
  const { netSell, margin, roi: roiNum } = calcDealMargin(buy, sell, fee)
  const roi = formatDealRoi(roiNum)

  const roiByCategory = useMemo(() => {
    const map = new Map<string, { margin: number; count: number }>()
    for (const d of deals) {
      const cat = d.category ?? 'other'
      const cur = map.get(cat) ?? { margin: 0, count: 0 }
      cur.margin += d.margin ?? 0
      cur.count++
      map.set(cat, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].margin - a[1].margin)
  }, [deals])

  const plReport = useMemo(() => buildPlReport(deals, plPeriod), [deals, plPeriod])
  const journalDeals = useMemo(
    () => filterDealsByPeriod(deals, plPeriod).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [deals, plPeriod]
  )
  const dealChains = useMemo(() => buildDealChains(journalDeals), [journalDeals])

  const roiBySource = useMemo(() => {
    const map = new Map<string, { margin: number; count: number }>()
    for (const d of deals) {
      const src = d.source ?? d.action ?? 'other'
      const cur = map.get(src) ?? { margin: 0, count: 0 }
      cur.margin += d.margin ?? 0
      cur.count++
      map.set(src, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].margin - a[1].margin)
  }, [deals])

  async function saveDeal(action = 'resell'): Promise<void> {
    await window.api.db.addDeal({
      action,
      item_id: itemId ? Number(itemId) : undefined,
      category,
      buy_price: buy || undefined,
      sell_price: sell || undefined,
      margin: margin || undefined,
      notes: notes || undefined,
      transfer_to: transferTo || undefined,
      source: dealSource,
      parent_deal_id: parentDealId ? Number(parentDealId) : undefined
    })
    await setDefaultFeePercent(fee)
    await refreshDeals()
    notify(t('reseller.saveDeal'), t('reseller.dealSaved'), 'success')
    setBuyPrice('')
    setSellPrice('')
    setNotes('')
    setItemId('')
    setTransferTo('')
  }

  async function logTransfer(): Promise<void> {
    if (transferring || !itemId || !transferTo || !secretAnswer) return
    setTransferring(true)
    try {
      const { user } = await getApiClient().findForumUser(transferTo.trim())
      if (!user?.user_id) {
        notify(t('reseller.transferFailed'), t('reseller.userNotFound', { user: transferTo.trim() }), 'error')
        return
      }
      await getApiClient().transferItem(Number(itemId), transferTo, secretAnswer)
      await saveDeal('transfer')
      notify(t('common.transfer'), t('reseller.transferOk', { id: itemId, user: transferTo }), 'success')
    } catch (e) {
      notify(t('reseller.transferFailed'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    } finally {
      setTransferring(false)
    }
  }

  async function checkGuaranteeBeforeRefuse(): Promise<void> {
    if (!itemId) return
    try {
      const { data } = await getApiClient().checkGuarantee(Number(itemId))
      setGuaranteeCheck(data.message ?? (data.can_refuse ? t('itemTools.guaranteeCanRefuse') : t('itemTools.guaranteeRisk')))
    } catch (e) {
      notify(t('reseller.guaranteeTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  async function refuseGuarantee(): Promise<void> {
    if (!itemId) return
    try {
      await getApiClient().refuseGuarantee(Number(itemId))
      await window.api.db.logActivity('reseller', 'refuse_guarantee', itemId)
      notify(t('reseller.guaranteeTitle'), t('reseller.guaranteeOk', { id: itemId }), 'success')
    } catch (e) {
      notify(t('common.error'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  function exportJournalDeals(): void {
    const csv = toCsv(journalDeals as unknown as Record<string, unknown>[], [
      'id', 'item_id', 'category', 'action', 'buy_price', 'sell_price', 'margin', 'transfer_to', 'notes', 'source', 'created_at'
    ])
    void window.api.export.saveCsv(`deals-${plPeriod}.csv`, csv)
  }

  function exportPlFormat(format: 'csv' | 'json' | 'html' | 'pdf' | 'xlsx'): void {
    void downloadPlReport(plReport, format, `pl-${plPeriod}`)
  }

  function handleExportPick(value: string): void {
    if (!value) return
    if (value === 'deals:csv') exportJournalDeals()
    else if (value.startsWith('pl:')) exportPlFormat(value.slice(3) as 'csv' | 'json' | 'html' | 'pdf' | 'xlsx')
    setExportPick('')
  }

  const plPeriodOptions = useMemo(
    () =>
      (['day', 'week', 'month', 'all'] as PlPeriod[]).map((p) => ({
        value: p,
        label: t(p === 'day' ? 'reseller.plDay' : p === 'week' ? 'reseller.plWeek' : p === 'month' ? 'reseller.plMonth' : 'reseller.plAll')
      })),
    [t]
  )

  const exportOptions = useMemo(
    () => [
      { value: '', label: t('reseller.plExportMenu') },
      { value: 'pl:csv', label: t('reseller.exportPlCsv') },
      { value: 'pl:json', label: t('reseller.exportPlJson') },
      { value: 'pl:html', label: t('reseller.exportPlHtml') },
      { value: 'pl:pdf', label: t('reseller.exportPlPdf') },
      { value: 'pl:xlsx', label: t('reseller.exportPlExcel') },
      { value: 'deals:csv', label: t('reseller.exportDealsCsv') }
    ],
    [t]
  )

  async function toggleAutoDeal(enabled: boolean): Promise<void> {
    setAutoDealEnabledState(enabled)
    await setAutoDealEnabled(enabled)
    await setDefaultFeePercent(fee)
  }

  async function fetchAiPrice(): Promise<void> {
    const id = Number(itemId)
    if (!id) return
    try {
      const { data } = await getApiClient().getAiPrice(id)
      if (data.price) {
        setAiPriceHint(data.price)
        setSellPrice(String(data.price))
      }
    } catch (e) {
      notify(t('upload.aiPriceTitle'), e instanceof LztApiError ? e.message : t('common.error'), 'error')
    }
  }

  const journalMain = (
    <ResellerJournalTab
      deals={journalDeals}
      plReport={plReport}
      plPeriod={plPeriod}
      onPlPeriodChange={setPlPeriod}
      plPeriodOptions={plPeriodOptions}
      exportPick={exportPick}
      exportOptions={exportOptions}
      onExportPick={handleExportPick}
      dealChains={dealChains}
      onOpenMarginCalc={() => setMarginModalOpen(true)}
    />
  )

  const insightsAside = (
    <ResellerInsightsPanel
      roiBySource={roiBySource}
      roiByCategory={roiByCategory}
    />
  )

  const transferMain = (
    <ResellerTransferTab
      itemId={itemId}
      setItemId={setItemId}
      transferTo={transferTo}
      setTransferTo={setTransferTo}
      secretConfigured={Boolean(secretAnswer.trim())}
      transferring={transferring}
      guaranteeCheck={guaranteeCheck}
      onTransfer={logTransfer}
      onCheckGuarantee={checkGuaranteeBeforeRefuse}
      onRefuseGuarantee={refuseGuarantee}
    />
  )

  const pageHeader = useMemo(() => {
    switch (tab) {
      case 'transfer':
        return {
          title: t('tabs.transfer'),
          subtitle: t('reseller.transferGuaranteeDesc'),
          badge: undefined as string | undefined,
          gridTop: undefined
        }
      case 'claims':
        return {
          title: t('tabs.claims'),
          subtitle: t('claims.pageSubtitle'),
          badge: undefined as string | undefined,
          gridTop: undefined
        }
      default:
        return {
          title: t('reseller.dealJournal'),
          subtitle: t('reseller.journalPageSubtitle'),
          badge: `${deals.length} ${t('common.records')}`,
          gridTop: <ResellerStatsRow plReport={plReport} />
        }
    }
  }, [tab, t, deals.length, plReport])

  return (
    <>
      <PageLayout
        title={pageHeader.title}
        subtitle={pageHeader.subtitle}
        badge={pageHeader.badge}
        gridTop={pageHeader.gridTop}
        main={tab === 'journal' ? journalMain : tab === 'transfer' ? transferMain : <ResellerClaimsTab />}
        aside={tab === 'journal' ? insightsAside : undefined}
      />
      <ResellerMarginModal
        open={marginModalOpen}
        onClose={() => setMarginModalOpen(false)}
        category={category}
        setCategory={setCategory}
        itemId={itemId}
        setItemId={setItemId}
        buyPrice={buyPrice}
        setBuyPrice={setBuyPrice}
        sellPrice={sellPrice}
        setSellPrice={setSellPrice}
        feePercent={feePercent}
        setFeePercent={setFeePercent}
        dealSource={dealSource}
        setDealSource={setDealSource}
        parentDealId={parentDealId}
        setParentDealId={setParentDealId}
        notes={notes}
        setNotes={setNotes}
        netSell={netSell}
        margin={margin}
        roi={roi}
        aiPriceHint={aiPriceHint}
        onFetchAiPrice={() => void fetchAiPrice()}
        onSave={() => saveDeal()}
        canSave={Boolean(buy || sell)}
        autoDealEnabled={autoDealEnabled}
        onAutoDealChange={(v) => void toggleAutoDeal(v)}
      />
    </>
  )
}
