import clsx from 'clsx'

interface SwitchProps {
  checked: boolean
  className?: string
}

export function Switch({ checked, className }: SwitchProps): React.ReactNode {
  return (
    <span className={clsx('ui-switch', checked && 'ui-switch-on', className)} aria-hidden="true">
      <span className="ui-switch-track">
        <span className="ui-switch-thumb" />
      </span>
    </span>
  )
}
