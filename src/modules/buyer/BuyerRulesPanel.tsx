import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Input, Select } from '@components/FormFields'
import { useCategoryOptions, useTranslation } from '@core/i18n'
import type { MonitorRule } from '@renderer/types/database'

export interface BuyerRulesPanelProps {
  rules: MonitorRule[]
  ruleName: string
  setRuleName: (v: string) => void
  ruleCategory: string
  setRuleCategory: (v: string) => void
  ruleTitleContains: string
  setRuleTitleContains: (v: string) => void
  rulePmax: string
  setRulePmax: (v: string) => void
  ruleTelegram: boolean
  setRuleTelegram: (v: boolean) => void
  ruleWatchlist: boolean
  setRuleWatchlist: (v: boolean) => void
  ruleAutobuy: boolean
  setRuleAutobuy: (v: boolean) => void
  onSaveRule: () => void | Promise<void>
  onDeleteRule: (id: number) => void
  ruleCategoryLabel: (rule: MonitorRule) => string
}

export function BuyerRulesPanel(props: BuyerRulesPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const categoryOptions = useCategoryOptions()

  return (
    <Card title={t('buyer.rulesTitle')} className="settings-form-card card-main">
      <div className="buyer-rules-form">
        <div className="buyer-rules-grid buyer-rules-grid-extended">
          <Input
            label={t('buyer.ruleName')}
            value={props.ruleName}
            onChange={(e) => props.setRuleName(e.target.value)}
          />
          <Select
            label={t('common.category')}
            value={props.ruleCategory}
            onChange={(e) => props.setRuleCategory(e.target.value)}
            options={categoryOptions}
          />
          <Input
            label={t('buyer.titleContains')}
            value={props.ruleTitleContains}
            onChange={(e) => props.setRuleTitleContains(e.target.value)}
            placeholder="CS2"
          />
          <Input
            label={t('buyer.maxPrice')}
            type="number"
            value={props.rulePmax}
            onChange={(e) => props.setRulePmax(e.target.value)}
          />
        </div>
        <div className="buyer-rule-toggles">
          <label className={clsx('buyer-rule-toggle', props.ruleTelegram && 'active')}>
            <input
              type="checkbox"
              checked={props.ruleTelegram}
              onChange={(e) => props.setRuleTelegram(e.target.checked)}
            />
            {t('buyer.actionTelegram')}
          </label>
          <label className={clsx('buyer-rule-toggle', props.ruleWatchlist && 'active')}>
            <input
              type="checkbox"
              checked={props.ruleWatchlist}
              onChange={(e) => props.setRuleWatchlist(e.target.checked)}
            />
            {t('buyer.actionWatchlist')}
          </label>
          <label className={clsx('buyer-rule-toggle', props.ruleAutobuy && 'active')}>
            <input
              type="checkbox"
              checked={props.ruleAutobuy}
              onChange={(e) => props.setRuleAutobuy(e.target.checked)}
            />
            {t('buyer.actionAutobuy')}
          </label>
        </div>
        <Button
          size="sm"
          variant="primary"
          className="buyer-save-rule-btn"
          onClick={() => void props.onSaveRule()}
          disabled={!props.ruleName.trim()}
        >
          {t('buyer.saveRule')}
        </Button>
      </div>

      {props.rules.length > 0 && (
        <div className="buyer-rule-list">
          {props.rules.map((rule) => (
            <div key={rule.id} className="buyer-rule-row">
              <div className="buyer-rule-body">
                <strong>{rule.name}</strong>
                <span>{props.ruleCategoryLabel(rule) || '—'}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void props.onDeleteRule(rule.id)}
                title={t('common.delete')}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
