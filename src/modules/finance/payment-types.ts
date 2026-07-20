import type { TranslationKey } from '@core/i18n'

export const PAYMENT_TYPE_ORDER = [
  'sold_item',
  'paid_item',
  'income',
  'cost',
  'refilled_balance',
  'withdrawal_balance',
  'money_transfer',
  'receiving_money',
  'internal_purchase',
  'claim_hold',
  'insurance_deposit',
  'paid_mail',
  'contest',
  'invoice',
  'balance_exchange'
] as const

const PAYMENT_TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  sold_item: 'finance.paymentType.sold_item',
  paid_item: 'finance.paymentType.paid_item',
  income: 'finance.paymentType.income',
  cost: 'finance.paymentType.cost',
  refilled_balance: 'finance.paymentType.refilled_balance',
  withdrawal_balance: 'finance.paymentType.withdrawal_balance',
  money_transfer: 'finance.paymentType.money_transfer',
  receiving_money: 'finance.paymentType.receiving_money',
  internal_purchase: 'finance.paymentType.internal_purchase',
  claim_hold: 'finance.paymentType.claim_hold',
  insurance_deposit: 'finance.paymentType.insurance_deposit',
  paid_mail: 'finance.paymentType.paid_mail',
  contest: 'finance.paymentType.contest',
  invoice: 'finance.paymentType.invoice',
  balance_exchange: 'finance.paymentType.balance_exchange'
}

export function getPaymentTypeLabel(
  type: string | undefined,
  t: (key: TranslationKey) => string
): string {
  if (!type) return '—'
  const key = PAYMENT_TYPE_LABEL_KEYS[type]
  if (key) return t(key)
  return type.replace(/_/g, ' ')
}

export function sortPaymentTypes(types: string[]): string[] {
  const order = PAYMENT_TYPE_ORDER as readonly string[]
  return [...types].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.localeCompare(b)
  })
}
