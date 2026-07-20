import { useCallback, useEffect, useState } from 'react'
import { getApiClient, LztApiError } from '@core/api-client'
import type { AutoPayment } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'

export function useFinanceAutoPay(): {
  autoPayments: AutoPayment[]
  loading: boolean
  busy: boolean
  status: string | null
  error: string | null
  autoPayUser: string
  setAutoPayUser: (v: string) => void
  autoPayAmount: string
  setAutoPayAmount: (v: string) => void
  autoPayCurrency: string
  setAutoPayCurrency: (v: string) => void
  autoPayComment: string
  setAutoPayComment: (v: string) => void
  refresh: () => Promise<void>
  createAutoPayment: () => Promise<boolean>
  removeAutoPayment: (id: number) => Promise<void>
  resetForm: () => void
  clearStatus: () => void
} {
  const { t } = useTranslation()
  const [autoPayments, setAutoPayments] = useState<AutoPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoPayUser, setAutoPayUser] = useState('')
  const [autoPayAmount, setAutoPayAmount] = useState('')
  const [autoPayCurrency, setAutoPayCurrency] = useState('rub')
  const [autoPayComment, setAutoPayComment] = useState('')

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      const { data } = await getApiClient().listAutoPayments()
      setAutoPayments(data.auto_payments ?? [])
    } catch (e) {
      if (!silent) setError(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  function resetForm(): void {
    setAutoPayUser('')
    setAutoPayAmount('')
    setAutoPayCurrency('rub')
    setAutoPayComment('')
  }

  function clearStatus(): void {
    setStatus(null)
    setError(null)
  }

  async function createAutoPayment(): Promise<boolean> {
    if (busy || !autoPayUser.trim() || !autoPayAmount) return false
    setBusy(true)
    setError(null)
    try {
      await getApiClient().createAutoPayment({
        username: autoPayUser.trim(),
        amount: Number(autoPayAmount),
        currency: autoPayCurrency,
        comment: autoPayComment || undefined
      })
      setStatus(t('finance.autoPaymentCreated'))
      resetForm()
      await refresh(false)
      return true
    } catch (e) {
      setError(e instanceof LztApiError ? e.message : t('common.error'))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function removeAutoPayment(id: number): Promise<void> {
    try {
      await getApiClient().deleteAutoPayment(id)
      await refresh(false)
    } catch (e) {
      setError(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  return {
    autoPayments,
    loading,
    busy,
    status,
    error,
    autoPayUser,
    setAutoPayUser,
    autoPayAmount,
    setAutoPayAmount,
    autoPayCurrency,
    setAutoPayCurrency,
    autoPayComment,
    setAutoPayComment,
    refresh,
    createAutoPayment,
    removeAutoPayment,
    resetForm,
    clearStatus
  }
}
