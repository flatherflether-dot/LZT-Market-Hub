import { useEffect } from 'react'
import clsx from 'clsx'
import { Play, Save, X, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import { useTranslation } from '@core/i18n'
import type { AutomationScheduleFormProps } from './AutomationSchedulePanel'

export type { AutomationScheduleFormProps }

export interface AutomationScheduleModalProps extends AutomationScheduleFormProps {
  open: boolean
  onClose: () => void
}

export function AutomationScheduleModal(props: AutomationScheduleModalProps): React.ReactNode {
  const { t } = useTranslation()

  useEffect(() => {
    if (!props.open) return
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [props.open, props.onClose])

  if (!props.open) return null

  return (
    <div className="modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className="modal-dialog automation-schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-schedule-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="automation-schedule-modal-title" className="modal-title">
              {t('automation.scheduleTask')}
            </h2>
            <p className="modal-description">{t('automation.createTask')}</p>
          </div>
          <button type="button" className="modal-close" onClick={props.onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body automation-schedule-fields">
          <Input label={t('common.name')} value={props.name} onChange={(e) => props.setName(e.target.value)} />
          <Select
            label={t('common.type')}
            value={props.type}
            onChange={(e) => props.setType(e.target.value)}
            options={props.scheduleTaskTypes}
          />
          <Input
            label={t('automation.intervalMinutes')}
            type="number"
            value={props.interval}
            onChange={(e) => props.setIntervalVal(e.target.value)}
          />

          {props.type === 'auto_bump_single' && (
            <>
              <Input label={t('common.itemId')} value={props.itemId} onChange={(e) => props.setItemId(e.target.value)} />
              <Input
                label={t('automation.bumpHour')}
                type="number"
                value={props.hour}
                onChange={(e) => props.setHour(e.target.value)}
              />
            </>
          )}

          {(props.type === 'auto_reprice_stale' || props.type === 'smart_reprice_stale') && (
            <>
              <Input
                label={t('automation.daysWithoutSale')}
                type="number"
                value={props.days}
                onChange={(e) => props.setDays(e.target.value)}
              />
              <Input
                label={t('automation.dropPercentVal')}
                type="number"
                value={props.drop}
                onChange={(e) => props.setDrop(e.target.value)}
              />
            </>
          )}

          {props.status && (
            <div
              className={clsx(
                'automation-status-banner',
                props.statusKind === 'success' && 'is-success',
                props.statusKind === 'error' && 'is-error'
              )}
            >
              <Zap size={14} />
              {props.status}
            </div>
          )}
        </div>

        <div className="modal-footer automation-schedule-modal-footer">
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          {props.type === 'auto_bump_single' && (
            <Button
              variant="secondary"
              onClick={() => void props.onRunNow()}
              disabled={!props.canRunNow}
            >
              <Play size={14} />
              {t('automation.runNow')}
            </Button>
          )}
          <Button onClick={() => void props.onSave()} disabled={!props.canSave}>
            <Save size={14} />
            {t('automation.saveTask')}
          </Button>
        </div>
      </div>
    </div>
  )
}
