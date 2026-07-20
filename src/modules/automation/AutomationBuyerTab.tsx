import { BuyerAutobuySettings, BuyerBlacklistPanel } from '@modules/buyer/BuyerAutomationPanels'
import { BuyerRulesPanel } from '@modules/buyer/BuyerRulesPanel'
import type { useBuyerAutomation } from '@modules/buyer/useBuyerAutomation'

type BuyerAutomationState = ReturnType<typeof useBuyerAutomation>

export function AutomationBuyerTab(props: BuyerAutomationState): React.ReactNode {
  return (
    <div className="automation-buyer-hub">
      <BuyerRulesPanel
        rules={props.rules}
        ruleName={props.ruleName}
        setRuleName={props.setRuleName}
        ruleCategory={props.ruleCategory}
        setRuleCategory={props.setRuleCategory}
        ruleTitleContains={props.ruleTitleContains}
        setRuleTitleContains={props.setRuleTitleContains}
        rulePmax={props.rulePmax}
        setRulePmax={props.setRulePmax}
        ruleTelegram={props.ruleTelegram}
        setRuleTelegram={props.setRuleTelegram}
        ruleWatchlist={props.ruleWatchlist}
        setRuleWatchlist={props.setRuleWatchlist}
        ruleAutobuy={props.ruleAutobuy}
        setRuleAutobuy={props.setRuleAutobuy}
        onSaveRule={props.saveRule}
        onDeleteRule={props.deleteRule}
        ruleCategoryLabel={props.ruleCategoryLabel}
      />

      <div className="automation-buyer-settings">
        <BuyerAutobuySettings
          autobuyEnabled={props.autobuyEnabled}
          setAutobuyEnabled={props.setAutobuyEnabled}
          autobuyMaxPrice={props.autobuyMaxPrice}
          setAutobuyMaxPrice={props.setAutobuyMaxPrice}
          autobuyMaxDaily={props.autobuyMaxDaily}
          setAutobuyMaxDaily={props.setAutobuyMaxDaily}
          autobuyUseApiPrice={props.autobuyUseApiPrice}
          setAutobuyUseApiPrice={props.setAutobuyUseApiPrice}
          autobuyMinSteamInv={props.autobuyMinSteamInv}
          setAutobuyMinSteamInv={props.setAutobuyMinSteamInv}
          monitorSkipViewed={props.monitorSkipViewed}
          setMonitorSkipViewed={props.setMonitorSkipViewed}
          autobuyToday={props.autobuyToday}
          onSave={props.saveSettings}
        />
        <BuyerBlacklistPanel
          blacklistType={props.blacklistType}
          setBlacklistType={props.setBlacklistType}
          blacklistValue={props.blacklistValue}
          setBlacklistValue={props.setBlacklistValue}
          blacklist={props.blacklist}
          onAdd={props.addBlacklistEntry}
          onDelete={props.deleteBlacklist}
        />
      </div>
    </div>
  )
}
