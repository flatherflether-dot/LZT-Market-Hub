import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select, Textarea } from '@components/FormFields'
import { SteamGuardPanel } from '@components/SteamGuardPanel'
import type { CsvPreflightResult } from '@core/csv-preflight'
import { useTranslation, type TranslationKey } from '@core/i18n'
import { BUILTIN_UPLOAD_TEMPLATES } from '@core/upload-templates'
import {
  EMAIL_TYPE_OPTIONS,
  GUARANTEE_OPTIONS,
  type CategoryUploadRequirements
} from '@core/upload-requirements'
import { preflightErrorField, preflightErrorLabel } from '@core/preflight-i18n'
import { getCategoryVisual } from './category-visuals'

export type UploadModalId = 'settings' | 'content' | 'templates' | 'tools' | 'preflight'

interface ModalShellProps {
  open: boolean
  title: string
  description?: string
  size?: 'md' | 'lg'
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

function ModalShell({ open, title, description, size = 'md', onClose, footer, children }: ModalShellProps): ReactNode {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={size === 'lg' ? 'modal-dialog modal-dialog-lg upload-modal' : 'modal-dialog upload-modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="upload-modal-title" className="modal-title">{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body upload-modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export interface UploadModalsProps {
  active: UploadModalId | null
  onClose: () => void
  publishMode: 'fast-sell' | 'item-add'
  isSteam: boolean
  supportsForceTempEmail: boolean
  requirements: CategoryUploadRequirements
  proxyOptions: Array<{ value: string; label: string }>
  preflightMsg: string | null
  preflightResult: CsvPreflightResult | null
  guaranteeDuration: string
  setGuaranteeDuration: (v: string) => void
  emailType: string
  setEmailType: (v: string) => void
  resellItemId: string
  setResellItemId: (v: string) => void
  aiPriceLoading: boolean
  aiPriceHint: number | null
  onFetchAiPrice: () => void
  forceTempEmail: boolean
  setForceTempEmail: (v: boolean) => void
  autoCheckAfterAdd: boolean
  setAutoCheckAfterAdd: (v: boolean) => void
  allowAskDiscount: boolean
  setAllowAskDiscount: (v: boolean) => void
  uploadMafileAfterSell: boolean
  setUploadMafileAfterSell: (v: boolean) => void
  skipDuplicates: boolean
  setSkipDuplicates: (v: boolean) => void
  proxyId: string
  setProxyId: (v: string) => void
  randomProxy: boolean
  setRandomProxy: (v: boolean) => void
  uploadWindowEnabled: boolean
  setUploadWindowEnabled: (v: boolean) => void
  uploadWindowStart: string
  setUploadWindowStart: (v: string) => void
  uploadWindowEnd: string
  setUploadWindowEnd: (v: string) => void
  onSaveUploadWindow: () => void
  defaultTitle: string
  setDefaultTitle: (v: string) => void
  defaultTitleEn: string
  setDefaultTitleEn: (v: string) => void
  autoGenerateTitle: boolean
  setAutoGenerateTitle: (v: boolean) => void
  description: string
  setDescription: (v: string) => void
  information: string
  setInformation: (v: string) => void
  bulkItemIds: string
  setBulkItemIds: (v: string) => void
  bulkPrice: string
  setBulkPrice: (v: string) => void
  onApplyBulkPrice: () => void
  onExportHistory: () => void
  onApplyTemplate: (id: string) => void
  category: string
}

export function UploadModals(props: UploadModalsProps): ReactNode {
  const { t } = useTranslation()
  const {
    active,
    onClose,
    publishMode,
    isSteam,
    requirements,
    proxyOptions,
    preflightMsg,
    preflightResult
  } = props

  return (
    <>
      <ModalShell
        open={active === 'settings'}
        title={t('upload.modalSettingsTitle')}
        description={t('upload.modalSettingsDesc')}
        size="lg"
        onClose={onClose}
        footer={
          <Button variant="secondary" onClick={() => { void props.onSaveUploadWindow(); onClose() }}>
            {t('common.save')}
          </Button>
        }
      >
        <div className="upload-modal-section">
          <h4>{t('upload.sectionListing')}</h4>
          <Select
            label={t('upload.guaranteeDuration')}
            value={props.guaranteeDuration}
            onChange={(e) => props.setGuaranteeDuration(e.target.value)}
            options={GUARANTEE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as TranslationKey) }))}
          />
          {requirements.requiresEmailLogin && (
            <Select
              label={t('upload.emailType')}
              value={props.emailType}
              onChange={(e) => props.setEmailType(e.target.value)}
              options={EMAIL_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as TranslationKey) }))}
            />
          )}
          <Input
            label={t('upload.resellItemId')}
            type="number"
            value={props.resellItemId}
            onChange={(e) => props.setResellItemId(e.target.value)}
            placeholder={t('upload.resellItemIdPlaceholder')}
          />
          {props.resellItemId && (
            <div className="form-toolbar">
              <Button size="sm" variant="secondary" onClick={props.onFetchAiPrice} disabled={props.aiPriceLoading}>
                {props.aiPriceLoading ? '…' : t('upload.aiPriceFetch')}
              </Button>
              {props.aiPriceHint !== null && (
                <span className="form-hint">{t('upload.aiPriceHint', { price: props.aiPriceHint })}</span>
              )}
            </div>
          )}
          <div className="upload-modal-checks">
            <label className="checkbox-row">
              <input type="checkbox" checked={props.allowAskDiscount} onChange={(e) => props.setAllowAskDiscount(e.target.checked)} />
              {t('upload.allowAskDiscount')}
            </label>
            {publishMode === 'fast-sell' && isSteam && requirements.supportsMafile && (
              <label className="checkbox-row">
                <input type="checkbox" checked={props.uploadMafileAfterSell} onChange={(e) => props.setUploadMafileAfterSell(e.target.checked)} />
                {t('upload.uploadMafileAfterSell')}
              </label>
            )}
            <label className="checkbox-row">
              <input type="checkbox" checked={props.skipDuplicates} onChange={(e) => props.setSkipDuplicates(e.target.checked)} />
              {t('upload.skipDuplicates')}
            </label>
          </div>
        </div>

        <div className="upload-modal-section">
          <h4>{t('upload.advancedTitle')}</h4>
          <Select
            label={t('upload.proxyId')}
            value={props.proxyId}
            onChange={(e) => props.setProxyId(e.target.value)}
            options={proxyOptions}
            disabled={props.randomProxy}
          />
          <label className="checkbox-row">
            <input type="checkbox" checked={props.randomProxy} onChange={(e) => props.setRandomProxy(e.target.checked)} />
            {t('upload.randomProxy')}
          </label>
          <p className="form-hint">{t('upload.proxyHint')}</p>
        </div>

        <div className="upload-modal-section">
          <h4>{t('upload.uploadWindowTitle')}</h4>
          <label className="checkbox-row">
            <input type="checkbox" checked={props.uploadWindowEnabled} onChange={(e) => props.setUploadWindowEnabled(e.target.checked)} />
            {t('upload.uploadWindowEnabled')}
          </label>
          <div className="form-row-2">
            <Input label={t('upload.uploadWindowStart')} type="number" value={props.uploadWindowStart} onChange={(e) => props.setUploadWindowStart(e.target.value)} />
            <Input label={t('upload.uploadWindowEnd')} type="number" value={props.uploadWindowEnd} onChange={(e) => props.setUploadWindowEnd(e.target.value)} />
          </div>
          <p className="form-hint">{t('upload.uploadWindowHint')}</p>
        </div>
      </ModalShell>

      <ModalShell
        open={active === 'content'}
        title={t('upload.modalContentTitle')}
        description={t('upload.modalContentDesc')}
        size="lg"
        onClose={onClose}
      >
        <div className="form-row-2">
          <Input label={t('upload.defaultTitle')} value={props.defaultTitle} onChange={(e) => props.setDefaultTitle(e.target.value)} placeholder={t('upload.defaultTitlePlaceholder')} />
          <Input label={t('upload.defaultTitleEn')} value={props.defaultTitleEn} onChange={(e) => props.setDefaultTitleEn(e.target.value)} placeholder={t('upload.defaultTitleEnPlaceholder')} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={props.autoGenerateTitle} onChange={(e) => props.setAutoGenerateTitle(e.target.checked)} />
          {t('upload.autoGenerateTitle')}
        </label>
        <Textarea label={t('upload.description')} rows={4} value={props.description} onChange={(e) => props.setDescription(e.target.value)} />
        <Textarea label={t('upload.information')} rows={4} value={props.information} onChange={(e) => props.setInformation(e.target.value)} />
      </ModalShell>

      <ModalShell
        open={active === 'templates'}
        title={t('upload.templatesTitle')}
        description={t('upload.templatesHint')}
        onClose={onClose}
      >
        <div className="upload-modal-templates">
          {BUILTIN_UPLOAD_TEMPLATES.map((tpl) => {
            const visual = getCategoryVisual(tpl.category)
            const Icon = visual.icon
            return (
              <button
                key={tpl.id}
                type="button"
                className="upload-modal-template"
                onClick={() => { props.onApplyTemplate(tpl.id); onClose() }}
              >
                <span className="upload-modal-template-icon" style={{ background: visual.gradient }}>
                  {visual.logoUrl ? (
                    <img src={visual.logoUrl} alt="" className="upload-form-template-logo" />
                  ) : (
                    <Icon size={16} />
                  )}
                </span>
                <span>
                  <strong>{t(tpl.nameKey as TranslationKey)}</strong>
                  <span>{visual.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </ModalShell>

      <ModalShell
        open={active === 'tools'}
        title={t('upload.modalToolsTitle')}
        description={t('upload.modalToolsDesc')}
        size="lg"
        onClose={onClose}
      >
        {isSteam && (
          <div className="upload-modal-section">
            <h4>{t('steamGuard.title')}</h4>
            <SteamGuardPanel />
          </div>
        )}
        <div className="upload-modal-section">
          <h4>{t('upload.bulkPriceTitle')}</h4>
          <p className="form-hint">{t('upload.bulkPriceDesc')}</p>
          <Input
            label={t('upload.bulkIdsLabel')}
            value={props.bulkItemIds}
            onChange={(e) => props.setBulkItemIds(e.target.value)}
            placeholder={t('upload.bulkIdsPlaceholder')}
          />
          <Input label={t('upload.newPrice')} type="number" value={props.bulkPrice} onChange={(e) => props.setBulkPrice(e.target.value)} />
          <div className="form-toolbar">
            <Button onClick={props.onApplyBulkPrice} disabled={!props.bulkPrice}>{t('upload.applyBulkPrice')}</Button>
            <Button variant="secondary" onClick={props.onExportHistory}>{t('upload.exportHistory')}</Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={active === 'preflight'}
        title={t('upload.preflightTitle')}
        description={preflightMsg ?? undefined}
        size="lg"
        onClose={onClose}
      >
        {preflightResult && preflightResult.summary.errors > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('upload.preflightColLine')}</th>
                  <th>{t('upload.preflightColField')}</th>
                  <th>{t('upload.preflightColReason')}</th>
                </tr>
              </thead>
              <tbody>
                {preflightResult.rows.flatMap((row) =>
                  row.errors.map((code) => (
                    <tr key={`${row.line}-${code}`}>
                      <td>{row.line}</td>
                      <td>{preflightErrorField(code)}</td>
                      <td>{preflightErrorLabel(t, code)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="upload-form-status">{preflightMsg}</p>
        )}
      </ModalShell>
    </>
  )
}
