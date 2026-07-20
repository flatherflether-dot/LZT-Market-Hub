import { ArrowRightLeft, AlertTriangle, Shield, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { Input } from '@components/FormFields'
import { useTranslation } from '@core/i18n'

export interface ResellerTransferTabProps {
  itemId: string
  setItemId: (v: string) => void
  transferTo: string
  setTransferTo: (v: string) => void
  secretConfigured: boolean
  transferring: boolean
  guaranteeCheck: string | null
  onTransfer: () => void
  onCheckGuarantee: () => void
  onRefuseGuarantee: () => void
}

export function ResellerTransferTab(props: ResellerTransferTabProps): React.ReactNode {
  const { t } = useTranslation()
  const canTransfer = Boolean(
    props.itemId && props.transferTo && props.secretConfigured && !props.transferring
  )

  return (
    <div className="dashboard-main-stack">
      <Card className="card-main">
        <div className="reseller-transfer-fields">
          <div className="reseller-transfer-grid">
            <Input
              label={t('common.itemId')}
              type="number"
              value={props.itemId}
              onChange={(e) => props.setItemId(e.target.value)}
            />
            <Input
              label={t('reseller.transferTo')}
              value={props.transferTo}
              onChange={(e) => props.setTransferTo(e.target.value)}
              placeholder="@username"
            />
          </div>
          {!props.secretConfigured && (
            <div className="reseller-transfer-hint is-warning">
              <AlertTriangle size={14} />
              <div className="reseller-transfer-hint-body">
                <span>{t('reseller.secretConfigureHint')}</span>
                <NavLink to="/settings?tab=security" className="reseller-transfer-settings-link">
                  {t('reseller.openSecuritySettings')}
                </NavLink>
              </div>
            </div>
          )}
        </div>

        <div className="reseller-transfer-actions">
          <Button
            variant="primary"
            className="reseller-transfer-primary"
            onClick={() => void props.onTransfer()}
            disabled={!canTransfer}
          >
            <ArrowRightLeft size={16} />
            {props.transferring ? '…' : t('reseller.transferViaApi')}
          </Button>
          <div className="reseller-action-grid">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void props.onCheckGuarantee()}
              disabled={!props.itemId}
            >
              <ShieldCheck size={14} />
              {t('itemTools.checkGuarantee')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void props.onRefuseGuarantee()}
              disabled={!props.itemId}
            >
              <Shield size={14} />
              {t('reseller.refuseGuarantee')}
            </Button>
          </div>
        </div>

        {props.guaranteeCheck && (
          <div className="reseller-status-banner">{props.guaranteeCheck}</div>
        )}
      </Card>
    </div>
  )
}
