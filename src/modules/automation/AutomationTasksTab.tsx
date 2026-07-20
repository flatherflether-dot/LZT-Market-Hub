import clsx from 'clsx'
import {
  AlertTriangle,
  Calendar,
  Clock,
  Inbox,
  Plus,
  RefreshCw,
  Trash2,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import { formatActivityAction } from '@core/activity-i18n'
import { AUTOMATION_PRESETS } from '@core/automation-presets'
import { useTranslation } from '@core/i18n'
import type { TranslationKey } from '@core/i18n'
import type { ScheduledTask } from '@renderer/types/database'
import { formatTaskInterval, getTaskVisual } from './automation-utils'

export interface AutomationTasksTabProps {
  tasks: ScheduledTask[]
  loading: boolean
  onDelete: (id: number) => void
  onApplyPreset: (presetId: string) => void
  onCreateTask: () => void
  getNextRunAt: (task: ScheduledTask) => Date
}

export function AutomationTasksTab(props: AutomationTasksTabProps): React.ReactNode {
  const { t } = useTranslation()

  const enabledCount = props.tasks.filter((task) => task.is_enabled).length
  const errorCount = props.tasks.filter((task) => task.last_error).length

  return (
    <div className="automation-hub">
      <section className="automation-section automation-tasks-card">
        <header className="automation-tasks-head">
          <div className="automation-tasks-head-main">
            <div className="automation-tasks-head-icon">
              <Zap size={18} />
            </div>
            <div>
              <h3>{t('automation.activeTasks')}</h3>
            </div>
          </div>
          <div className="automation-tasks-head-actions">
            <Button
              size="sm"
              variant="primary"
              className="automation-create-task-btn"
              onClick={props.onCreateTask}
            >
              <Plus size={14} />
              {t('automation.scheduleTask')}
            </Button>
          </div>
        </header>

        <div className="automation-tasks-body">
          <div className="automation-tasks-stats">
            <div className="automation-tasks-stat">
              <span>{t('automation.activeTasks')}</span>
              <strong>{props.tasks.length}</strong>
            </div>
            <div className="automation-tasks-stat is-enabled">
              <span>{t('common.on')}</span>
              <strong>{enabledCount}</strong>
            </div>
            <div className={clsx('automation-tasks-stat', errorCount > 0 && 'is-error')}>
              <span>{t('automation.lastError')}</span>
              <strong>{errorCount}</strong>
            </div>
          </div>

          <div className="automation-presets">
            <span className="automation-presets-label">{t('automation.presetsTitle')}</span>
            <div className="automation-presets-list">
              {AUTOMATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="automation-preset-pill"
                  onClick={() => props.onApplyPreset(preset.id)}
                >
                  {t(preset.nameKey as TranslationKey)}
                </button>
              ))}
            </div>
          </div>

          {props.tasks.length === 0 ? (
            <div className="automation-empty">
              {props.loading ? <RefreshCw size={32} className="spin-icon" /> : <Inbox size={32} />}
              <p>{props.loading ? t('layout.loadingProfile') : t('automation.noTasks')}</p>
              {!props.loading && (
                <Button variant="primary" onClick={props.onCreateTask}>
                  <Plus size={14} />
                  {t('automation.scheduleTask')}
                </Button>
              )}
            </div>
          ) : (
            <div className="automation-tasks-list">
              {props.tasks.map((task) => {
                const visual = getTaskVisual(task.type)
                const Icon = visual.icon
                const nextRun = props.getNextRunAt(task)

                return (
                  <article key={task.id} className={clsx('automation-task-row', task.last_error && 'has-error')}>
                    <div className="automation-task-icon" style={{ color: visual.color, background: visual.bg }}>
                      <Icon size={18} />
                    </div>

                    <div className="automation-task-body">
                      <div className="automation-task-head">
                        <span className="automation-task-name">{task.name}</span>
                        <span className="automation-task-interval">{formatTaskInterval(task.interval_minutes)}</span>
                      </div>
                      <div className="automation-task-meta">
                        <span className="automation-task-type">{formatActivityAction(t, task.type)}</span>
                        {task.is_enabled ? (
                          <span className="automation-task-badge is-on">{t('common.on')}</span>
                        ) : (
                          <span className="automation-task-badge">{t('common.off')}</span>
                        )}
                      </div>
                      <div className="automation-task-times">
                        <span>
                          <Calendar size={12} />
                          {t('automation.nextRun')}: {nextRun.toLocaleString()}
                        </span>
                        <span>
                          <Clock size={12} />
                          {t('common.lastRun')}:{' '}
                          {task.last_run_at ? new Date(task.last_run_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      {task.last_error && (
                        <div className="automation-task-error" title={task.last_error}>
                          <AlertTriangle size={12} />
                          {task.last_error}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="automation-task-delete"
                      onClick={() => void props.onDelete(task.id)}
                    >
                      <Trash2 size={14} />
                      {t('common.delete')}
                    </Button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
