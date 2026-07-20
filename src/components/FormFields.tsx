import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

interface MenuPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

function getMenuPosition(
  trigger: HTMLButtonElement,
  optionCount: number,
  menuMinWidth = 0
): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const gap = 6
  const viewportPadding = 8
  const itemHeight = 44
  const preferredMax = Math.min(480, optionCount * itemHeight + 8)

  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding
  const spaceAbove = rect.top - gap - viewportPadding
  const openUp = spaceBelow < preferredMax && spaceAbove > spaceBelow
  const available = Math.max(80, openUp ? spaceAbove : spaceBelow)
  const maxHeight = Math.min(preferredMax, available)

  return {
    top: openUp ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
    left: rect.left,
    width: Math.max(rect.width, menuMinWidth),
    maxHeight
  }
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ label, hint, className, id, ...props }: InputProps): ReactNode {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <dl className={clsx('ctrlUnit', className)}>
      {label && (
        <dt>
          <label htmlFor={inputId}>{label}</label>
        </dt>
      )}
      <dd>
        <input id={inputId} className="textCtrl" {...props} />
        {hint && <span className="ctrlUnit-hint">{hint}</span>}
      </dd>
    </dl>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps): ReactNode {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <dl className={clsx('ctrlUnit', className)}>
      {label && (
        <dt>
          <label htmlFor={inputId}>{label}</label>
        </dt>
      )}
      <dd>
        <textarea id={inputId} className="textCtrl" {...props} />
        {hint && <span className="ctrlUnit-hint">{hint}</span>}
      </dd>
    </dl>
  )
}

interface SelectProps {
  label?: string
  ariaLabel?: string
  compact?: boolean
  menuMinWidth?: number
  options: Array<{ value: string; label: string }>
  value?: string
  onChange?: (event: { target: { value: string; name?: string } }) => void
  disabled?: boolean
  id?: string
  className?: string
  name?: string
}

export function Select({
  label,
  ariaLabel,
  compact,
  menuMinWidth = 0,
  options,
  className,
  id,
  value = '',
  onChange,
  disabled,
  name
}: SelectProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const rootRef = useRef<HTMLDListElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const selected = options.find((opt) => opt.value === value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null)
      return
    }

    const updatePosition = (): void => {
      if (!triggerRef.current) return
      setMenuPosition(getMenuPosition(triggerRef.current, options.length, menuMinWidth))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, options.length, menuMinWidth])

  useEffect(() => {
    if (!open) return

    function onDocumentMouseDown(event: MouseEvent): void {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    function onDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [open])

  function pick(optionValue: string): void {
    onChange?.({ target: { value: optionValue, name } })
    setOpen(false)
  }

  const menu =
    open && menuPosition
      ? createPortal(
          <ul
            ref={menuRef}
            className="custom-select-menu custom-select-menu-portal"
            role="listbox"
            aria-labelledby={label ? `${inputId}-label` : undefined}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={clsx('custom-select-option', isSelected && 'custom-select-option-selected')}
                    onClick={() => pick(opt.value)}
                  >
                    <span className="custom-select-check-slot">
                      {isSelected && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body
        )
      : null

  return (
    <dl
      className={clsx('ctrlUnit custom-select', open && 'custom-select-open', compact && 'custom-select-compact', className)}
      ref={rootRef}
    >
      {label && !compact && (
        <dt id={`${inputId}-label`}>
          <label htmlFor={inputId}>{label}</label>
        </dt>
      )}
      <dd>
        <button
          ref={triggerRef}
          type="button"
          id={inputId}
          className={clsx('custom-select-trigger textCtrl', open && 'custom-select-trigger-open')}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={compact ? (ariaLabel ?? label) : undefined}
          aria-labelledby={!compact && label ? `${inputId}-label` : undefined}
          onClick={() => !disabled && setOpen((prev) => !prev)}
        >
          <span className="custom-select-value">{selected?.label ?? value}</span>
          <ChevronDown size={16} className={clsx('custom-select-chevron', open && 'custom-select-chevron-open')} />
        </button>
        {menu}
      </dd>
    </dl>
  )
}
