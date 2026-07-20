export interface AutomationScheduleFormProps {
  name: string
  setName: (v: string) => void
  type: string
  setType: (v: string) => void
  scheduleTaskTypes: { value: string; label: string }[]
  interval: string
  setIntervalVal: (v: string) => void
  itemId: string
  setItemId: (v: string) => void
  hour: string
  setHour: (v: string) => void
  days: string
  setDays: (v: string) => void
  drop: string
  setDrop: (v: string) => void
  status: string | null
  statusKind: 'info' | 'success' | 'error'
  onSave: () => void | Promise<void>
  onRunNow: () => void | Promise<void>
  canSave: boolean
  canRunNow: boolean
}

export type AutomationSchedulePanelProps = AutomationScheduleFormProps
