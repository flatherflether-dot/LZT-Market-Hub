import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { getApiClient, LztApiError } from '@core/api-client'
import { useAutoRefresh } from '@core/use-auto-refresh'
import type {
  BalanceEntry,
  PaymentRecord,
  ProfileResponse
} from '@core/constants'
import { parseProfileBalance, formatRubCompact } from '@core/market-utils'
import {
  buildRubEquivItems,
  parseLztCurrencyResponse,
  sortedMarketRateCodes,
  type BalanceEquivItem,
  type LztCurrencySnapshot,
  type EquivBasis
} from '@core/lzt-currency'
import { useTranslation } from '@core/i18n'
import { FinanceAutoPayTab } from '@modules/finance/FinanceAutoPayTab'
import { FinanceOverviewMain } from '@modules/finance/FinanceOverviewMain'
import { FinancePaymentsTab } from '@modules/finance/FinancePaymentsTab'
import { FinanceTransferTab } from '@modules/finance/FinanceTransferTab'
import { useFinanceAutoPay } from '@modules/finance/useFinanceAutoPay'

type FinanceTab = 'overview' | 'payments' | 'transfer' | 'autopay'

const FINANCE_TABS = ['overview', 'payments', 'transfer', 'autopay'] as const
const CURRENCY_REFRESH_MS = 10 * 60 * 1000

export function FinancePage(): React.ReactNode {
  const { t } = useTranslation()
  const [tab] = useQueryTab<FinanceTab>('tab', 'overview', FINANCE_TABS)
  const autoPay = useFinanceAutoPay()
  const [autoPayModalOpen, setAutoPayModalOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [balances, setBalances] = useState<BalanceEntry[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [transferUser, setTransferUser] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferCurrency, setTransferCurrency] = useState('rub')
  const [transferComment, setTransferComment] = useState('')
  const [secretAnswer, setSecretAnswer] = useState('')
  const [transferFee, setTransferFee] = useState<number | null>(null)

  const [currencySnapshot, setCurrencySnapshot] = useState<LztCurrencySnapshot | null>(null)
  const [equivBasis, setEquivBasis] = useState<EquivBasis>('available')

  const syncFinance = useCallback(async (silent = false): Promise<void> => {
    if (!silent) {
      setLoading(true)
      setError(null)
      setStatus(null)
    }
    const client = getApiClient()
    try {
      const [{ data: prof }, balRes, payRes, currencyRes] = await Promise.all([
        client.getProfile<ProfileResponse>(),
        client.getBalances().catch(() => ({ data: { balances: [] as BalanceEntry[] } })),
        client.getPaymentsHistory<{ payments?: PaymentRecord[] }>({ page: 1 }).catch(() => ({ data: { payments: [] as PaymentRecord[] } })),
        client.getCurrency().catch(() => ({ data: null }))
      ])
      setProfile(prof)
      setBalances(balRes.data.balances ?? [])
      setPayments(payRes.data.payments ?? [])
      setCurrencySnapshot(currencyRes.data ? parseLztCurrencyResponse(currencyRes.data) : null)
      if (!silent) setStatus(t('finance.syncOk'))
    } catch (e) {
      if (!silent) setError(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  const refreshCurrencyRates = useCallback(async (): Promise<void> => {
    try {
      const { data } = await getApiClient().getCurrency()
      const parsed = data ? parseLztCurrencyResponse(data) : null
      if (parsed) setCurrencySnapshot(parsed)
    } catch {

    }
  }, [])

  useEffect(() => {
    void window.api.db.getSetting('market_secret_answer').then((v) => {
      if (v) setSecretAnswer(v)
    })
    void syncFinance(false)
  }, [syncFinance])

  useAutoRefresh(() => syncFinance(true), [syncFinance])
  useAutoRefresh(() => refreshCurrencyRates(), [refreshCurrencyRates], CURRENCY_REFRESH_MS)

  const { balance, hold } = parseProfileBalance(profile)
  const available = Math.max(0, balance - hold)

  const equivRubAmount = useMemo(() => {
    if (equivBasis === 'balance') return balance
    if (equivBasis === 'hold') return hold
    return available
  }, [equivBasis, balance, hold, available])

  const equivItems = useMemo((): BalanceEquivItem[] => {
    if (!currencySnapshot || equivRubAmount <= 0) return []
    return buildRubEquivItems(equivRubAmount, currencySnapshot)
  }, [currencySnapshot, equivRubAmount])

  const marketRateCodes = useMemo(
    () => (currencySnapshot ? sortedMarketRateCodes(currencySnapshot) : []),
    [currencySnapshot]
  )

  async function submitTransfer(): Promise<void> {
    if (busy || !transferUser.trim() || !transferAmount || !secretAnswer) return
    setBusy(true)
    try {
      const { user } = await getApiClient().findForumUser(transferUser.trim())
      if (!user?.user_id) {
        setStatus(t('finance.userNotFound', { user: transferUser.trim() }))
        return
      }
      await getApiClient().transferMoney({
        username: transferUser.trim(),
        amount: Number(transferAmount),
        currency: transferCurrency,
        secret_answer: secretAnswer,
        comment: transferComment || undefined
      })
      setStatus(t('finance.transferOk'))
      await syncFinance(false)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function fetchTransferFee(): Promise<void> {
    if (!transferUser.trim() || !transferAmount) return
    try {
      const { user } = await getApiClient().findForumUser(transferUser.trim())
      if (!user?.user_id) {
        setStatus(t('finance.userNotFound', { user: transferUser.trim() }))
        return
      }
      const { data } = await getApiClient().getTransferFee({
        username: transferUser.trim(),
        amount: Number(transferAmount),
        currency: transferCurrency
      })
      setTransferFee(data.fee ?? null)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  function openAutoPayModal(): void {
    autoPay.clearStatus()
    setAutoPayModalOpen(true)
  }

  function closeAutoPayModal(): void {
    setAutoPayModalOpen(false)
    autoPay.clearStatus()
  }

  async function handleCreateAutoPayment(): Promise<void> {
    const created = await autoPay.createAutoPayment()
    if (created) closeAutoPayModal()
  }

  const pageHeader = useMemo(() => {
    if (tab === 'autopay') {
      return {
        title: t('tabs.financeAutopay'),
        subtitle: t('finance.autoPaymentsDesc')
      }
    }
    if (tab === 'payments') {
      return {
        title: t('finance.paymentsTitle'),
        subtitle: t('finance.paymentsDesc')
      }
    }
    if (tab === 'transfer') {
      return {
        title: t('finance.transferTab'),
        subtitle: t('finance.transferDesc')
      }
    }
    return {
      title: t('finance.title'),
      subtitle: t('finance.subtitle')
    }
  }, [tab, t])

  const mainByTab: Record<FinanceTab, React.ReactNode> = {
    overview: (
      <FinanceOverviewMain
        balance={balance}
        hold={hold}
        available={available}
        balances={balances}
        currencySnapshot={currencySnapshot}
        equivItems={equivItems}
        marketRateCodes={marketRateCodes}
        equivBasis={equivBasis}
        setEquivBasis={setEquivBasis}
        loading={loading}
        status={status}
        error={error}
      />
    ),
    payments: (
      <FinancePaymentsTab
        payments={payments}
        loading={loading}
        status={status}
        error={error}
      />
    ),
    transfer: (
      <FinanceTransferTab
        transferUser={transferUser}
        setTransferUser={setTransferUser}
        transferAmount={transferAmount}
        setTransferAmount={setTransferAmount}
        transferCurrency={transferCurrency}
        setTransferCurrency={setTransferCurrency}
        transferComment={transferComment}
        setTransferComment={setTransferComment}
        secretAnswer={secretAnswer}
        setSecretAnswer={setSecretAnswer}
        transferFee={transferFee}
        busy={busy}
        status={status}
        onFetchFee={() => void fetchTransferFee()}
        onSubmit={() => void submitTransfer()}
      />
    ),
    autopay: (
      <FinanceAutoPayTab
        autoPayments={autoPay.autoPayments}
        loading={autoPay.loading}
        busy={autoPay.busy}
        status={autoPay.status}
        error={autoPay.error}
        modalOpen={autoPayModalOpen}
        onOpenModal={openAutoPayModal}
        onCloseModal={closeAutoPayModal}
        autoPayUser={autoPay.autoPayUser}
        setAutoPayUser={autoPay.setAutoPayUser}
        autoPayAmount={autoPay.autoPayAmount}
        setAutoPayAmount={autoPay.setAutoPayAmount}
        autoPayCurrency={autoPay.autoPayCurrency}
        setAutoPayCurrency={autoPay.setAutoPayCurrency}
        autoPayComment={autoPay.autoPayComment}
        setAutoPayComment={autoPay.setAutoPayComment}
        onCreate={handleCreateAutoPayment}
        onRemove={autoPay.removeAutoPayment}
      />
    )
  }

  return (
    <PageLayout
      title={pageHeader.title}
      subtitle={pageHeader.subtitle}
      badge={<span className="finance-hub-badge">{profile ? formatRubCompact(balance) : '—'}</span>}
      main={mainByTab[tab]}
    />
  )
}
