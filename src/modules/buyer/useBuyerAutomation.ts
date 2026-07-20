import { useCallback, useEffect, useState } from 'react'
import { formatMarketText } from '@core/market-utils'
import { useTranslation } from '@core/i18n'
import { notify } from '@core/ui-store'
import type { BlacklistEntry, MonitorRule } from '@renderer/types/database'

export function useBuyerAutomation(): {
  rules: MonitorRule[]
  blacklist: BlacklistEntry[]
  autobuyEnabled: boolean
  setAutobuyEnabled: (v: boolean) => void
  autobuyMaxPrice: string
  setAutobuyMaxPrice: (v: string) => void
  autobuyMaxDaily: string
  setAutobuyMaxDaily: (v: string) => void
  autobuyUseApiPrice: boolean
  setAutobuyUseApiPrice: (v: boolean) => void
  autobuyMinSteamInv: string
  setAutobuyMinSteamInv: (v: string) => void
  monitorSkipViewed: boolean
  setMonitorSkipViewed: (v: boolean) => void
  autobuyToday: number
  blacklistValue: string
  setBlacklistValue: (v: string) => void
  blacklistType: string
  setBlacklistType: (v: string) => void
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
  refresh: () => Promise<void>
  saveSettings: () => Promise<void>
  saveRule: () => Promise<void>
  addBlacklistEntry: () => Promise<void>
  deleteRule: (id: number) => Promise<void>
  deleteBlacklist: (id: number) => Promise<void>
  ruleCategoryLabel: (rule: MonitorRule) => string
} {
  const { t } = useTranslation()
  const [rules, setRules] = useState<MonitorRule[]>([])
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [autobuyEnabled, setAutobuyEnabled] = useState(false)
  const [autobuyMaxPrice, setAutobuyMaxPrice] = useState('500')
  const [autobuyMaxDaily, setAutobuyMaxDaily] = useState('5')
  const [autobuyUseApiPrice, setAutobuyUseApiPrice] = useState(true)
  const [autobuyMinSteamInv, setAutobuyMinSteamInv] = useState('')
  const [monitorSkipViewed, setMonitorSkipViewed] = useState(true)
  const [autobuyToday, setAutobuyToday] = useState(0)
  const [blacklistValue, setBlacklistValue] = useState('')
  const [blacklistType, setBlacklistType] = useState('keyword')
  const [ruleName, setRuleName] = useState('')
  const [ruleCategory, setRuleCategory] = useState('steam')
  const [ruleTitleContains, setRuleTitleContains] = useState('')
  const [rulePmax, setRulePmax] = useState('500')
  const [ruleTelegram, setRuleTelegram] = useState(true)
  const [ruleWatchlist, setRuleWatchlist] = useState(true)
  const [ruleAutobuy, setRuleAutobuy] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setRules(await window.api.db.getMonitorRules())
    setBlacklist(await window.api.db.getBlacklist())
    setAutobuyToday(await window.api.db.getAutobuyCountToday())
  }, [])

  useEffect(() => {
    void refresh()
    void window.api.db.getSetting('autobuy_enabled').then((v) => setAutobuyEnabled(v === '1'))
    void window.api.db.getSetting('autobuy_max_price').then((v) => { if (v) setAutobuyMaxPrice(v) })
    void window.api.db.getSetting('autobuy_max_daily').then((v) => { if (v) setAutobuyMaxDaily(v) })
    void window.api.db.getSetting('autobuy_use_api_price').then((v) => setAutobuyUseApiPrice(v !== '0'))
    void window.api.db.getSetting('autobuy_min_steam_inv').then((v) => { if (v) setAutobuyMinSteamInv(v) })
    void window.api.db.getSetting('monitor_skip_viewed').then((v) => setMonitorSkipViewed(v !== '0'))
  }, [refresh])

  async function saveSettings(): Promise<void> {
    await window.api.db.setSetting('autobuy_enabled', autobuyEnabled ? '1' : '0')
    await window.api.db.setSetting('autobuy_max_price', autobuyMaxPrice)
    await window.api.db.setSetting('autobuy_max_daily', autobuyMaxDaily)
    await window.api.db.setSetting('autobuy_use_api_price', autobuyUseApiPrice ? '1' : '0')
    await window.api.db.setSetting('autobuy_min_steam_inv', autobuyMinSteamInv)
    await window.api.db.setSetting('monitor_skip_viewed', monitorSkipViewed ? '1' : '0')
    notify(t('buyer.autobuyTitle'), t('buyer.settingsSaved'), 'success')
  }

  async function saveRule(): Promise<void> {
    if (!ruleName.trim()) return
    await window.api.db.saveMonitorRule({
      name: ruleName,
      category: ruleCategory,
      conditions_json: JSON.stringify({
        category: ruleCategory,
        pmax: Number(rulePmax) || undefined,
        title_contains: ruleTitleContains || undefined
      }),
      actions_json: JSON.stringify({
        telegram: ruleTelegram,
        watchlist: ruleWatchlist,
        autobuy: ruleAutobuy,
        desktop_notify: true
      }),
      is_enabled: 1,
      priority: 10
    })
    setRuleName('')
    setRuleTitleContains('')
    await refresh()
    notify(t('buyer.rulesTitle'), t('buyer.ruleSaved'), 'success')
  }

  async function addBlacklistEntry(): Promise<void> {
    if (!blacklistValue.trim()) return
    await window.api.db.addBlacklist({ type: blacklistType, value: blacklistValue.trim() })
    setBlacklistValue('')
    await refresh()
  }

  async function deleteRule(id: number): Promise<void> {
    await window.api.db.deleteMonitorRule(id)
    await refresh()
  }

  async function deleteBlacklist(id: number): Promise<void> {
    await window.api.db.deleteBlacklist(id)
    await refresh()
  }

  function ruleCategoryLabel(rule: MonitorRule): string {
    const direct = formatMarketText(rule.category)
    if (direct) return direct
    try {
      return formatMarketText((JSON.parse(rule.conditions_json) as { category?: unknown }).category)
    } catch {
      return ''
    }
  }

  return {
    rules,
    blacklist,
    autobuyEnabled,
    setAutobuyEnabled,
    autobuyMaxPrice,
    setAutobuyMaxPrice,
    autobuyMaxDaily,
    setAutobuyMaxDaily,
    autobuyUseApiPrice,
    setAutobuyUseApiPrice,
    autobuyMinSteamInv,
    setAutobuyMinSteamInv,
    monitorSkipViewed,
    setMonitorSkipViewed,
    autobuyToday,
    blacklistValue,
    setBlacklistValue,
    blacklistType,
    setBlacklistType,
    ruleName,
    setRuleName,
    ruleCategory,
    setRuleCategory,
    ruleTitleContains,
    setRuleTitleContains,
    rulePmax,
    setRulePmax,
    ruleTelegram,
    setRuleTelegram,
    ruleWatchlist,
    setRuleWatchlist,
    ruleAutobuy,
    setRuleAutobuy,
    refresh,
    saveSettings,
    saveRule,
    addBlacklistEntry,
    deleteRule,
    deleteBlacklist,
    ruleCategoryLabel
  }
}
