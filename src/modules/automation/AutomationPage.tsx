import { useMemo, useState } from 'react'
import { PageLayout } from '@components/PageLayout'
import { useQueryTab } from '@core/use-query-tab'
import { useTranslation } from '@core/i18n'
import { AutomationBulkTab } from '@modules/automation/AutomationBulkTab'
import { AutomationBuyerTab } from '@modules/automation/AutomationBuyerTab'
import { AutomationScheduleModal } from '@modules/automation/AutomationScheduleModal'
import { AutomationTasksTab } from '@modules/automation/AutomationTasksTab'
import { TagManagerPanel } from '@modules/automation/TagManagerPanel'
import { useAutomationTasks } from '@modules/automation/useAutomationTasks'
import { useBuyerAutomation } from '@modules/buyer/useBuyerAutomation'

type AutomationTab = 'tasks' | 'bulk' | 'tags' | 'buyer'

const AUTOMATION_TABS = ['tasks', 'bulk', 'tags', 'buyer'] as const

export function AutomationPage(): React.ReactNode {
  const { t } = useTranslation()
  const [tab] = useQueryTab<AutomationTab>('tab', 'tasks', AUTOMATION_TABS)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const automation = useAutomationTasks()
  const buyerAutomation = useBuyerAutomation()

  function openScheduleModal(): void {
    automation.clearStatus()
    setScheduleOpen(true)
  }

  function closeScheduleModal(): void {
    setScheduleOpen(false)
    automation.clearStatus()
  }

  async function handleSaveTask(): Promise<void> {
    const saved = await automation.saveTask()
    if (saved) closeScheduleModal()
  }

  function handleApplyPreset(presetId: string): void {
    automation.applyPreset(presetId)
    openScheduleModal()
  }

  const pageHeader = useMemo(() => {
    if (tab === 'buyer') {
      return {
        title: t('tabs.buyerAutomation'),
        subtitle: t('automation.buyerSubtitle')
      }
    }
    return {
      title: t('automation.title'),
      subtitle: t('automation.subtitle')
    }
  }, [tab, t])

  const mainByTab: Record<AutomationTab, React.ReactNode> = {
    tasks: (
      <>
        <AutomationTasksTab
          tasks={automation.tasks}
          loading={automation.loading}
          onDelete={(id) => void automation.deleteTask(id)}
          onApplyPreset={handleApplyPreset}
          onCreateTask={openScheduleModal}
          getNextRunAt={automation.getNextRunAt}
        />
        <AutomationScheduleModal
          open={scheduleOpen}
          onClose={closeScheduleModal}
          {...automation.schedule}
          onSave={handleSaveTask}
        />
      </>
    ),
    bulk: <AutomationBulkTab />,
    tags: <TagManagerPanel />,
    buyer: <AutomationBuyerTab {...buyerAutomation} />
  }

  return (
    <PageLayout
      title={pageHeader.title}
      subtitle={pageHeader.subtitle}
      badge={
        tab === 'tasks' ? (
          <span className="automation-hub-badge">
            {t('automation.tasksCount', { count: automation.tasks.length })}
          </span>
        ) : tab === 'buyer' ? (
          <span className="automation-hub-badge">
            {t('automation.buyerRulesCount', { count: buyerAutomation.rules.length })}
          </span>
        ) : undefined
      }
      main={mainByTab[tab]}
    />
  )
}
