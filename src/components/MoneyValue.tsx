import clsx from 'clsx'
import { formatRub, formatRubCompact } from '@core/market-utils'

interface MoneyValueProps {
  value: unknown
  className?: string
  tag?: 'span' | 'strong'
  compact?: boolean
  title?: string
}

export function MoneyValue({
  value,
  className,
  tag: Tag = 'span',
  compact = false,
  title
}: MoneyValueProps): React.ReactNode {
  const full = formatRub(value)
  const text = compact ? formatRubCompact(value) : full

  return (
    <Tag className={clsx('money-value', compact && 'money-value-compact', className)} title={title ?? full}>
      {text}
    </Tag>
  )
}
