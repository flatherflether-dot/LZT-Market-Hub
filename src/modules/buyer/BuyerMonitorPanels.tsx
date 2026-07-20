import clsx from 'clsx'
import { Search, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Select } from '@components/FormFields'
import { useTranslation } from '@core/i18n'
import type { WatchFilter } from '@renderer/types/database'

export interface BuyerMonitorControlPanelProps {
  filters: WatchFilter[]
  activeFilterId: number | null
  setActiveFilterId: (id: number | null) => void
  isMonitoring: boolean
  status: string | null
  onPreview: () => void
  onToggleMonitor: () => void
}

export function BuyerMonitorControlPanel(props: BuyerMonitorControlPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const enabledFilters = props.filters.filter((f) => f.is_enabled)

  return (
    <Card title={t('buyer.monitorControl')} className="settings-form-card buyer-monitor-control-card">
      {props.filters.length === 0 ? (
        <p className="empty-state">{t('buyer.noFiltersForMonitor')}</p>
      ) : (
        <div className="buyer-monitor-control">
          <div className="buyer-monitor-control-field">
            <Select
              label={t('buyer.activeFilter')}
              value={props.activeFilterId ? String(props.activeFilterId) : ''}
              onChange={(e) => props.setActiveFilterId(e.target.value ? Number(e.target.value) : null)}
              options={[
                { value: '', label: t('buyer.filterAutoRotate') },
                ...props.filters.map((f) => ({
                  value: String(f.id),
                  label: `${f.name}${f.is_enabled ? '' : ` (${t('common.off')})`}`
                }))
              ]}
            />
            {enabledFilters.length > 0 && (
              <p className="buyer-monitor-filter-hint muted">
                {t('buyer.monitorFilterHint', { count: enabledFilters.length })}
              </p>
            )}
          </div>

          <div className="buyer-monitor-control-actions">
            <Button
              size="sm"
              variant="secondary"
              className="buyer-watch-btn"
              onClick={() => void props.onPreview()}
              disabled={props.filters.length === 0}
            >
              <Search size={14} />
              {t('buyer.previewSearch')}
            </Button>
            <Button
              variant="primary"
              className={clsx('buyer-watch-monitor-btn', props.isMonitoring && 'is-active')}
              onClick={() => void props.onToggleMonitor()}
              disabled={enabledFilters.length === 0}
            >
              <Zap size={16} />
              {props.isMonitoring ? t('buyer.stopMonitor') : t('buyer.startMonitor')}
            </Button>
            {props.status && (
              <div className="buyer-status-banner" role="status">
                {props.status}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
