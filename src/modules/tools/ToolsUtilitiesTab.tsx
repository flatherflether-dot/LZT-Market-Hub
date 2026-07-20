import clsx from 'clsx'
import {
  CopyCheck,
  Download,
  ExternalLink,
  HardDrive,
  Hash,
  Inbox,
  Search,
  Server,
  Zap
} from 'lucide-react'
import { Button } from '@components/Button'
import { Input, Select } from '@components/FormFields'
import type { MarketItem, MarketTag } from '@core/constants'
import { formatRub, marketItemUrl } from '@core/market-utils'
import { useTranslation } from '@core/i18n'

export interface ToolsUtilitiesTabProps {
  searchQuery: string
  setSearchQuery: (v: string) => void
  searchTagId: string
  setSearchTagId: (v: string) => void
  marketTags: MarketTag[]
  searchResults: MarketItem[]
  onSearch: () => void
  onExportSearch: () => void
  itemIdInput: string
  setItemIdInput: (v: string) => void
  itemLookup: MarketItem | null
  onLookupItem: () => void
  dupLogin: string
  setDupLogin: (v: string) => void
  dupResult: 'duplicate' | 'new' | null
  onCheckDuplicate: () => void
  uploadEnabled: boolean
  buyerEnabled: boolean
  proxyList: string
  setProxyList: (v: string) => void
  proxyLineCount: number
  onUploadProxies: () => void
  onLoadProxies: () => void
  onBackupDb: () => void
  onRestoreDb: () => void
  onExportBundle: () => void
  onExportActivity: () => void
  onExportUploadHistory: () => void
  onResetSeenCache: () => void
  toolsStatus: string | null
}

export function ToolsUtilitiesTab(props: ToolsUtilitiesTabProps): React.ReactNode {
  const { t } = useTranslation()

  return (
    <div className="tools-hub tools-utilities-hub">
      <section className="tools-section tools-search-card">
        <header className="tools-section-head">
          <div className="tools-section-head-main">
            <div className="tools-section-head-icon">
              <Search size={18} />
            </div>
            <div>
              <h3>{t('tools.searchTitle')}</h3>
            </div>
          </div>
          {props.searchResults.length > 0 && (
            <span className="tools-count-badge">{props.searchResults.length}</span>
          )}
        </header>

        <div className="tools-section-body">
          <div className="tools-search-panel">
            <Input
              label={t('tools.titleContains')}
              value={props.searchQuery}
              onChange={(e) => props.setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void props.onSearch()}
            />
            <Select
              label={t('tags.filterByTag')}
              value={props.searchTagId}
              onChange={(e) => props.setSearchTagId(e.target.value)}
              options={[
                { value: '', label: t('buyer.filterAllCategories') },
                ...props.marketTags.map((tag) => ({ value: String(tag.tag_id), label: tag.title }))
              ]}
            />
            <Button
              className="tools-search-btn"
              onClick={() => void props.onSearch()}
              disabled={!props.searchQuery.trim() && !props.searchTagId}
            >
              <Search size={14} />
              {t('common.search')}
            </Button>
          </div>

          {props.searchResults.length > 0 && (
            <div className="tools-results-toolbar">
              <span>{t('tools.searchResultsCount', { count: props.searchResults.length })}</span>
              <Button size="sm" variant="secondary" className="tools-toolbar-btn" onClick={props.onExportSearch}>
                <Download size={14} />
                {t('tools.exportSearchResults')}
              </Button>
            </div>
          )}

          {props.searchResults.length === 0 ? (
            <div className="tools-empty tools-empty-compact">
              <Inbox size={32} />
              <p>{t('common.noData')}</p>
            </div>
          ) : (
            <div className="tools-result-list-modern">
              {props.searchResults.slice(0, 30).map((item) => (
                <article key={item.item_id} className="tools-result-row-modern">
                  <div className="tools-result-row-body">
                    <div className="tools-result-row-head">
                      <strong>{formatRub(item.price)}</strong>
                      <span>#{item.item_id}</span>
                    </div>
                    <p>{item.title}</p>
                  </div>
                  <a
                    className="tools-result-link-modern"
                    href={marketItemUrl(item.item_id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={14} />
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="tools-utilities-grid-4">
        <section className="tools-section tools-lookup-card">
          <header className="tools-section-head tools-section-head-compact">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <Hash size={18} />
              </div>
              <div>
                <h3>{t('tools.itemLookupTitle')}</h3>
                <p>{t('tools.itemLookupHint')}</p>
              </div>
            </div>
          </header>
          <div className="tools-section-body tools-utility-body-modern">
            <div className="tools-inline-search">
              <Input
                label={t('tools.itemId')}
                type="number"
                value={props.itemIdInput}
                onChange={(e) => props.setItemIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void props.onLookupItem()}
              />
              <Button onClick={() => void props.onLookupItem()} disabled={!props.itemIdInput.trim()}>
                <Search size={14} />
                {t('common.search')}
              </Button>
            </div>
            {props.itemLookup ? (
              <div className="tools-item-preview-modern">
                <div className="tools-item-preview-head">
                  <strong>#{props.itemLookup.item_id}</strong>
                  <span>{formatRub(props.itemLookup.price)}</span>
                </div>
                <p>{props.itemLookup.title}</p>
                {props.itemLookup.item_state && (
                  <span className="tools-item-state">{props.itemLookup.item_state}</span>
                )}
                <a
                  className="tools-item-market-link"
                  href={marketItemUrl(props.itemLookup.item_id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('tools.openOnMarket')}
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <div className="tools-empty tools-empty-compact">
                <Hash size={28} />
                <p>{t('tools.itemLookupEmpty')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="tools-section tools-dup-card">
          <header className="tools-section-head tools-section-head-compact">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <CopyCheck size={18} />
              </div>
              <div>
                <h3>{t('tools.duplicateTitle')}</h3>
                <p>{t('tools.duplicateHint')}</p>
              </div>
            </div>
          </header>
          <div className="tools-section-body tools-utility-body-modern">
            {props.uploadEnabled ? (
              <>
                <div className="tools-inline-search">
                  <Input
                    label={t('tools.loginToCheck')}
                    value={props.dupLogin}
                    onChange={(e) => props.setDupLogin(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && props.dupLogin.trim() && void props.onCheckDuplicate()}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void props.onCheckDuplicate()}
                    disabled={!props.dupLogin.trim()}
                  >
                    {t('tools.checkHistory')}
                  </Button>
                </div>
                {props.dupResult ? (
                  <div
                    className={clsx(
                      'tools-dup-result-modern',
                      props.dupResult === 'duplicate' ? 'is-warn' : 'is-ok'
                    )}
                  >
                    <strong>
                      {props.dupResult === 'duplicate' ? t('tools.duplicateWarn') : t('tools.duplicateOk')}
                    </strong>
                    <span>
                      {props.dupResult === 'duplicate'
                        ? t('tools.duplicateFound', { login: props.dupLogin })
                        : t('tools.duplicateNew', { login: props.dupLogin })}
                    </span>
                  </div>
                ) : (
                  <div className="tools-empty tools-empty-compact">
                    <CopyCheck size={28} />
                    <p>{t('tools.duplicateEmpty')}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="tools-empty tools-empty-compact">
                <p>{t('tools.moduleFeatureOff')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="tools-section tools-proxy-card">
          <header className="tools-section-head tools-section-head-compact">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <Server size={18} />
              </div>
              <div>
                <h3>{t('tools.proxyTitle')}</h3>
                <p>{t('tools.proxyHint')}</p>
              </div>
            </div>
            {props.proxyLineCount > 0 && (
              <span className="tools-count-badge">{props.proxyLineCount}</span>
            )}
          </header>
          <div className="tools-section-body tools-utility-body-modern">
            <textarea
              className="textCtrl tools-proxy-textarea-modern"
              rows={5}
              placeholder={t('tools.proxyPlaceholder')}
              value={props.proxyList}
              onChange={(e) => props.setProxyList(e.target.value)}
            />
            <div className="tools-section-actions">
              <Button onClick={() => void props.onUploadProxies()} disabled={!props.proxyList.trim()}>
                {t('tools.uploadProxies')}
              </Button>
              <Button variant="secondary" onClick={() => void props.onLoadProxies()}>
                {t('tools.listProxies')}
              </Button>
            </div>
          </div>
        </section>

        <section className="tools-section tools-backup-card">
          <header className="tools-section-head tools-section-head-compact">
            <div className="tools-section-head-main">
              <div className="tools-section-head-icon">
                <HardDrive size={18} />
              </div>
              <div>
                <h3>{t('tools.backupTitle')}</h3>
                <p>{t('tools.backupHint')}</p>
              </div>
            </div>
          </header>
          <div className="tools-section-body tools-utility-body-modern tools-utility-actions-body">
            <div className="tools-action-grid">
              <Button variant="secondary" onClick={() => void props.onBackupDb()}>
                {t('tools.backupDb')}
              </Button>
              <Button variant="secondary" onClick={() => void props.onRestoreDb()}>
                {t('tools.restoreDb')}
              </Button>
              <Button variant="secondary" onClick={() => void props.onExportBundle()}>
                {t('tools.exportBundle')}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="tools-section tools-export-card">
            <header className="tools-section-head tools-section-head-compact">
              <div className="tools-section-head-main">
                <div className="tools-section-head-icon">
                  <Download size={18} />
                </div>
                <div>
                  <h3>{t('tools.exportTitle')}</h3>
                </div>
              </div>
            </header>
            <div className="tools-section-body">
              <div className="tools-action-grid">
                <Button variant="secondary" onClick={props.onExportActivity}>
                  {t('tools.exportActivity')}
                </Button>
                {props.uploadEnabled && (
                  <Button variant="secondary" onClick={() => void props.onExportUploadHistory()}>
                    {t('tools.exportUploadHistory')}
                  </Button>
                )}
                {props.buyerEnabled && (
                  <Button variant="secondary" onClick={() => void props.onResetSeenCache()}>
                    {t('tools.resetSeenCache')}
                  </Button>
                )}
              </div>
              {props.toolsStatus && (
                <div className="tools-inline-status">
                  <Zap size={14} />
                  {props.toolsStatus}
                </div>
              )}
            </div>
          </section>
    </div>
  )
}
