import clsx from 'clsx'
import { Check, ChevronDown, Globe2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation, type Locale } from '@core/i18n'

interface LanguageSwitcherProps {
  compact?: boolean

  hideLabel?: boolean

  segmented?: boolean
}

export function LanguageSwitcher({
  compact = false,
  hideLabel = false,
  segmented = false
}: LanguageSwitcherProps): React.ReactNode {
  const { locale, setLocale, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  async function pick(next: Locale): Promise<void> {
    if (next !== locale) await setLocale(next)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const languages: Array<{ id: Locale; label: string }> = [
    { id: 'ru', label: t('common.russian') },
    { id: 'en', label: t('common.english') }
  ]
  const active = languages.find((language) => language.id === locale) ?? languages[0]

  return (
    <div
      ref={rootRef}
      className={clsx(
        'lang-switch',
        compact && 'lang-switch-compact',
        segmented && 'lang-switch-segmented',
        hideLabel && 'lang-switch-no-label',
        open && 'lang-switch-open'
      )}
    >
      {!compact && !hideLabel && !segmented && (
        <span className="lang-switch-label">{t('common.language')}</span>
      )}
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        onClick={() => setOpen((next) => !next)}
      >
        <Globe2 className="lang-trigger-icon" size={20} strokeWidth={2.1} />
        <span>{active.label}</span>
        <ChevronDown size={14} className="lang-trigger-chevron" />
      </button>
      {open && (
        <div className="lang-menu" role="listbox" aria-label={t('common.language')}>
          {languages.map((language) => (
            <button
              key={language.id}
              type="button"
              className={clsx('lang-option', language.id === locale && 'lang-option-active')}
              role="option"
              aria-selected={language.id === locale}
              onClick={() => void pick(language.id)}
            >
              <span>{language.label}</span>
              {language.id === locale && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
