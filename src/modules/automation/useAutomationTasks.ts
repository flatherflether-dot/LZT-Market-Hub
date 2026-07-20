import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiClient, LztApiError } from '@core/api-client'
import { AUTOMATION_PRESETS, getNextRunAt } from '@core/automation-presets'
import { useTaskTypeOptions, useTranslation } from '@core/i18n'
import type { TranslationKey } from '@core/i18n'
import type { ScheduledTask } from '@renderer/types/database'
import { useAutoRefresh } from '@core/use-auto-refresh'

const SCHEDULE_TASK_TYPES = new Set(['auto_bump_single', 'auto_reprice_stale', 'smart_reprice_stale'])

export function useAutomationTasks(onTasksChange?: (tasks: ScheduledTask[]) => void) {
  const { t } = useTranslation()
  const taskTypeOptions = useTaskTypeOptions()
  const scheduleTaskTypes = useMemo(
    () => taskTypeOptions.filter((option) => SCHEDULE_TASK_TYPES.has(option.value)),
    [taskTypeOptions]
  )

  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('auto_bump_single')
  const [itemId, setItemId] = useState('')
  const [hour, setHour] = useState('6')
  const [interval, setIntervalVal] = useState('60')
  const [days, setDays] = useState('7')
  const [drop, setDrop] = useState('5')
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')

  const refreshTasks = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    try {
      const list = await window.api.db.getTasks()
      setTasks(list)
      onTasksChange?.(list)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [onTasksChange])

  useEffect(() => {
    void refreshTasks(false)
  }, [refreshTasks])

  useAutoRefresh(() => refreshTasks(true), [refreshTasks])

  useEffect(() => {
    setName((current) => current || t('automation.task.auto_bump_single'))
  }, [t])

  async function saveTask(): Promise<boolean> {
    const config: Record<string, unknown> = {}
    if (type === 'auto_bump_single') {
      config.item_id = Number(itemId)
      config.hour = Number(hour)
    } else if (type === 'auto_reprice_stale' || type === 'smart_reprice_stale') {
      config.days_without_sale = Number(days)
      config.drop_percent = Number(drop)
      config.min_margin_percent = 10
      config.respect_buy_price = true
      config.use_category_median = type === 'smart_reprice_stale'
    }

    await window.api.db.saveTask({
      name,
      type,
      config_json: JSON.stringify(config),
      interval_minutes: Number(interval) || 60,
      is_enabled: 1
    })
    await refreshTasks(false)
    await window.api.db.logActivity('automation', 'task_created', name)
    setStatus(t('automation.taskSaved', { name }))
    setStatusKind('success')
    return true
  }

  function clearStatus(): void {
    setStatus(null)
    setStatusKind('info')
  }

  async function deleteTask(id: number): Promise<void> {
    await window.api.db.deleteTask(id)
    await refreshTasks(false)
  }

  async function runAutoBump(): Promise<void> {
    try {
      await getApiClient().autoBump(Number(itemId), Number(hour) || 6)
      setStatus(t('automation.autoBumpOk', { id: itemId }))
      setStatusKind('success')
      await window.api.db.logActivity('automation', 'auto_bump', itemId)
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
      setStatusKind('error')
    }
  }

  function applyPreset(presetId: string): void {
    const preset = AUTOMATION_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setName(t(preset.nameKey as TranslationKey))
    setType(preset.type)
    setIntervalVal(String(preset.intervalMinutes))
    if (preset.config.hour) setHour(String(preset.config.hour))
    if (preset.config.days_without_sale) setDays(String(preset.config.days_without_sale))
    if (preset.config.drop_percent_fallback) setDrop(String(preset.config.drop_percent_fallback))
    if (preset.config.item_id) setItemId(String(preset.config.item_id))
  }

  const canSave =
    type === 'auto_bump_single'
      ? Boolean(itemId)
      : type === 'auto_reprice_stale' || type === 'smart_reprice_stale'

  return {
    tasks,
    loading,
    refreshTasks,
    deleteTask,
    applyPreset,
    saveTask,
    clearStatus,
    getNextRunAt,
    schedule: {
      name,
      setName,
      type,
      setType,
      scheduleTaskTypes,
      interval,
      setIntervalVal,
      itemId,
      setItemId,
      hour,
      setHour,
      days,
      setDays,
      drop,
      setDrop,
      status,
      statusKind,
      onSave: () => void saveTask(),
      onRunNow: () => void runAutoBump(),
      canSave,
      canRunNow: Boolean(itemId)
    }
  }
}
