import { Ban, Save, Shield } from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Input, Select } from '@components/FormFields'
import { useTranslation } from '@core/i18n'
import type { BlacklistEntry } from '@renderer/types/database'

export interface BuyerAutobuySettingsProps {
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
  onSave: () => void | Promise<void>
}

export function BuyerAutobuySettings(props: BuyerAutobuySettingsProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <Card title={t('buyer.autobuyTitle')} className="settings-form-card">
      <label className="buyer-toggle">
        <input
          type="checkbox"
          checked={props.autobuyEnabled}
          onChange={(e) => props.setAutobuyEnabled(e.target.checked)}
        />
        <span>{t('buyer.autobuyEnabled')}</span>
      </label>
      <div className="buyer-watch-prices">
        <Input
          label={t('buyer.autobuyMaxPrice')}
          type="number"
          value={props.autobuyMaxPrice}
          onChange={(e) => props.setAutobuyMaxPrice(e.target.value)}
        />
        <Input
          label={t('buyer.autobuyMaxDaily')}
          type="number"
          value={props.autobuyMaxDaily}
          onChange={(e) => props.setAutobuyMaxDaily(e.target.value)}
        />
      </div>
      <label className="buyer-toggle">
        <input
          type="checkbox"
          checked={props.autobuyUseApiPrice}
          onChange={(e) => props.setAutobuyUseApiPrice(e.target.checked)}
        />
        <span>{t('buyer.autobuyUseApiPrice')}</span>
      </label>
      <Input
        label={t('buyer.autobuyMinSteamInv')}
        type="number"
        value={props.autobuyMinSteamInv}
        onChange={(e) => props.setAutobuyMinSteamInv(e.target.value)}
        hint={t('buyer.autobuyMinSteamInvHint')}
      />
      <label className="buyer-toggle">
        <input
          type="checkbox"
          checked={props.monitorSkipViewed}
          onChange={(e) => props.setMonitorSkipViewed(e.target.checked)}
        />
        <span>{t('buyer.monitorSkipViewed')}</span>
      </label>
      <div className="buyer-side-stat">{t('buyer.autobuyToday', { count: props.autobuyToday })}</div>
      <Button size="sm" className="buyer-watch-btn" variant="secondary" onClick={() => void props.onSave()}>
        <Save size={14} />
        {t('common.save')}
      </Button>
    </Card>
  )
}

export interface BuyerBlacklistPanelProps {
  blacklistType: string
  setBlacklistType: (v: string) => void
  blacklistValue: string
  setBlacklistValue: (v: string) => void
  blacklist: BlacklistEntry[]
  onAdd: () => void | Promise<void>
  onDelete: (id: number) => void
}

export function BuyerBlacklistPanel(props: BuyerBlacklistPanelProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <Card title={t('buyer.blacklistTitle')} className="settings-form-card">
      <Select
        label={t('common.type')}
        value={props.blacklistType}
        onChange={(e) => props.setBlacklistType(e.target.value)}
        options={[
          { value: 'keyword', label: t('buyer.blacklistKeyword') },
          { value: 'seller', label: t('buyer.blacklistSeller') }
        ]}
      />
      <Input
        value={props.blacklistValue}
        onChange={(e) => props.setBlacklistValue(e.target.value)}
        placeholder="scam"
      />
      <Button size="sm" className="buyer-watch-btn" variant="secondary" onClick={() => void props.onAdd()}>
        <Shield size={14} />
        {t('common.save')}
      </Button>
      {props.blacklist.length > 0 && (
        <div className="buyer-blacklist-list">
          {props.blacklist.slice(0, 12).map((b) => (
            <div key={b.id} className="buyer-blacklist-row">
              <Ban size={12} />
              <span>{b.type}: {b.value}</span>
              <button type="button" onClick={() => void props.onDelete(b.id)} aria-label={t('common.delete')}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
