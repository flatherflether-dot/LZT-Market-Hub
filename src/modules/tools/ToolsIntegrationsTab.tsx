import clsx from 'clsx'
import { Globe, Mail, Plus, Save, Send, Trash2, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import type { ImapConfigEntry } from '@renderer/types/database'
import { useTranslation } from '@core/i18n'
import type { TranslationKey } from '@core/i18n'

export interface ToolsIntegrationsTabProps {
  botToken: string
  setBotToken: (v: string) => void
  chatId: string
  setChatId: (v: string) => void
  telegramConfigured: boolean
  telegramTesting: boolean
  onSaveTelegram: () => void
  onTestTelegram: () => void
  webhookSectionVisible: boolean
  webhookEnabled: boolean
  setWebhookEnabled: (v: boolean) => void
  webhookUrl: string
  setWebhookUrl: (v: string) => void
  webhookEvents: string[]
  visibleWebhookEvents: readonly string[]
  toggleWebhookEvent: (event: string) => void
  webhookTesting: boolean
  onSaveWebhook: () => void
  onTestWebhook: () => void
  uploadEnabled: boolean
  imapConfigs: ImapConfigEntry[]
  selectedImapDomain: string | null
  imapDomain: string
  setImapDomain: (v: string) => void
  imapHost: string
  setImapHost: (v: string) => void
  imapPort: string
  setImapPort: (v: string) => void
  imapSsl: boolean
  setImapSsl: (v: boolean) => void
  imapLoading: boolean
  imapSaving: boolean
  toolsStatus: string | null
  onResetImapForm: () => void
  onLoadImapConfigs: () => void
  onSelectImapConfig: (config: ImapConfigEntry) => void
  onDeleteImapConfig: (domain?: string) => void
  onSaveImap: () => void
}

export function ToolsIntegrationsTab(props: ToolsIntegrationsTabProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="tools-hub">
      <section className="tools-section tools-telegram-card">
        <header className="tools-section-head">
          <div className="tools-section-head-main">
            <div className="tools-section-head-icon">
              <Send size={18} />
            </div>
            <div>
              <h3>{t('tools.telegramTitle')}</h3>
              <p>{t('tools.telegramHint')}</p>
            </div>
          </div>
          <span className={clsx('tools-config-badge', props.telegramConfigured && 'is-on')}>
            {props.telegramConfigured ? t('tools.telegramConfigured') : t('tools.telegramNotConfigured')}
          </span>
        </header>

        <div className="tools-section-body">
          <div className="tools-section-fields">
            <Input
              label={t('tools.botToken')}
              type="password"
              value={props.botToken}
              onChange={(e) => props.setBotToken(e.target.value)}
              placeholder="123456:ABC..."
            />
            <Input
              label={t('tools.chatId')}
              value={props.chatId}
              onChange={(e) => props.setChatId(e.target.value)}
              placeholder="-1001234567890"
            />
          </div>
          <div className="tools-section-actions">
            <Button onClick={() => void props.onSaveTelegram()} disabled={!props.telegramConfigured}>
              <Save size={14} />
              {t('tools.saveTelegram')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void props.onTestTelegram()}
              disabled={!props.telegramConfigured || props.telegramTesting}
            >
              <Send size={14} />
              {props.telegramTesting ? '…' : t('tools.testTelegram')}
            </Button>
          </div>
        </div>
      </section>

      {props.webhookSectionVisible && (
        <section className="tools-section tools-webhook-card">
          <header className="tools-section-head">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <Globe size={18} />
              </div>
              <div>
                <h3>{t('tools.webhookTitle')}</h3>
                <p>{t('tools.webhookHint')}</p>
              </div>
            </div>
          </header>

          <div className="tools-section-body">
            <p className="tools-section-note">{t('tools.webhookOutboundNote')}</p>

            <label className="tools-toggle-row">
              <input
                type="checkbox"
                checked={props.webhookEnabled}
                onChange={(e) => props.setWebhookEnabled(e.target.checked)}
              />
              <span>{t('tools.webhookEnabled')}</span>
            </label>

            <Input
              label={t('tools.webhookUrl')}
              value={props.webhookUrl}
              onChange={(e) => props.setWebhookUrl(e.target.value)}
              placeholder="https://example.com/hook"
            />

            <div className="tools-webhook-events">
              <span className="tools-webhook-events-label">{t('common.action')}</span>
              <div className="tools-webhook-events-grid">
                {props.visibleWebhookEvents.map((ev) => (
                  <label key={ev} className={clsx('tools-event-pill', props.webhookEvents.includes(ev) && 'is-active')}>
                    <input
                      type="checkbox"
                      checked={props.webhookEvents.includes(ev)}
                      onChange={() => props.toggleWebhookEvent(ev)}
                    />
                    {t(`tools.webhookEvent.${ev}` as TranslationKey)}
                  </label>
                ))}
              </div>
            </div>

            <div className="tools-section-actions">
              <Button onClick={() => void props.onSaveWebhook()} disabled={!props.webhookUrl.trim()}>
                <Save size={14} />
                {t('common.save')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void props.onTestWebhook()}
                disabled={!props.webhookUrl.trim() || props.webhookTesting}
              >
                <Zap size={14} />
                {props.webhookTesting ? '…' : t('tools.testWebhook')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {props.uploadEnabled && (
        <section className="tools-section tools-imap-card">
          <header className="tools-section-head">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <Mail size={18} />
              </div>
              <div>
                <h3>{t('tools.imapTitle')}</h3>
                <p>{t('tools.imapHint')}</p>
              </div>
            </div>
            <div className="tools-section-toolbar">
              <Button size="sm" variant="secondary" className="tools-toolbar-btn" onClick={() => props.onResetImapForm()}>
                <Plus size={14} />
                {t('tools.imapAddNew')}
              </Button>
            </div>
          </header>

          <div className="tools-section-body">
            {props.imapConfigs.length === 0 ? (
              <div className="tools-empty tools-empty-compact">
                <Mail size={32} />
                <p>{t('tools.imapEmpty')}</p>
              </div>
            ) : (
              <div className="tools-imap-list-modern">
                {props.imapConfigs.map((config) => (
                  <article
                    key={config.domain}
                    className={clsx('tools-imap-row', props.selectedImapDomain === config.domain && 'is-selected')}
                  >
                    <button type="button" className="tools-imap-row-select" onClick={() => props.onSelectImapConfig(config)}>
                      <strong>{config.domain}</strong>
                      <span>
                        {config.imap_host || '—'}:{config.imap_port}
                        {config.imap_ssl ? ` · ${t('tools.imapSsl')}` : ''}
                      </span>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void props.onDeleteImapConfig(config.domain)}
                      disabled={props.imapSaving}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </article>
                ))}
              </div>
            )}

            <div className="tools-imap-form-panel">
              <span className="tools-imap-form-label">
                {props.selectedImapDomain
                  ? t('tools.imapEditing', { domain: props.selectedImapDomain })
                  : t('tools.imapAddNewHint')}
              </span>
              <div className="tools-imap-form-grid">
                <Input
                  label={t('tools.domain')}
                  value={props.imapDomain}
                  onChange={(e) => props.setImapDomain(e.target.value)}
                  placeholder="example.com"
                />
                <Input
                  label={t('tools.port')}
                  type="number"
                  value={props.imapPort}
                  onChange={(e) => props.setImapPort(e.target.value)}
                />
              </div>
              <Input
                label={t('tools.imapHost')}
                value={props.imapHost}
                onChange={(e) => props.setImapHost(e.target.value)}
                placeholder="imap.example.com"
              />
              <label className="tools-toggle-row">
                <input type="checkbox" checked={props.imapSsl} onChange={(e) => props.setImapSsl(e.target.checked)} />
                <span>{t('tools.imapSsl')}</span>
              </label>
              <div className="tools-section-actions">
                <Button
                  onClick={() => void props.onSaveImap()}
                  disabled={!props.imapDomain.trim() || !props.imapHost.trim() || props.imapSaving}
                >
                  <Save size={14} />
                  {props.selectedImapDomain ? t('common.save') : t('tools.saveImap')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void props.onDeleteImapConfig()}
                  disabled={!props.imapDomain.trim() || props.imapSaving}
                >
                  <Trash2 size={14} />
                  {t('common.delete')}
                </Button>
              </div>
            </div>

            {props.toolsStatus && <div className="tools-inline-status">{props.toolsStatus}</div>}
          </div>
        </section>
      )}
    </div>
  )
}
