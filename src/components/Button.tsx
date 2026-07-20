import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'primary',
  secondary: '',
  ghost: 'dark',
  danger: 'red'
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      className={clsx(
        'button',
        variantClass[variant] || undefined,
        size === 'sm' && 'smallButton',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
