import { Copy, ExternalLink } from 'lucide-react'
import type { MarketItemDetailResponse } from '@core/constants'
import { extractCategoryFields, formatItemTimestamp } from '@core/item-detail'
import { useTranslation } from '@core/i18n'
import type { UploadHistoryEntry } from '@renderer/types/database'

interface ItemDetailOverviewTabProps {
  entry: UploadHistoryEntry
  detail?: MarketItemDetailResponse
  initialPrice?: number | null
  currentPrice?: number
  priceChanged?: boolean
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <div className="lot-info-cell">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

export function ItemDetailOverviewTab({
  entry,
  detail,
  initialPrice,
  currentPrice,
  priceChanged
}: ItemDetailOverviewTabProps): React.ReactNode {
  const { t } = useTranslation()
  const item = detail?.item
  const categoryFields = item ? extractCategoryFields(item) : []

  return (
    <div className="lot-modal-tab-pane">
      <div className="lot-modal-grid">
        <div className="lot-modal-col lot-modal-col-main">
          <section className="lot-modal-panel">
            <h3 className="lot-modal-panel-title">{t('itemDetail.listingInfo')}</h3>
            <div className="lot-info-grid">
              <InfoCell label={t('common.login')}>
                <div className="lot-info-value">
                  <code>{entry.login}</code>
                  <button
                    type="button"
                    className="lot-copy-btn"
                    onClick={() => void navigator.clipboard.writeText(entry.login)}
                    aria-label="Copy"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </InfoCell>
              <InfoCell label={t('upload.accountsColLiveState')}>{item?.item_state ?? '—'}</InfoCell>
              <InfoCell label={t('itemDetail.views')}>{item?.view_count?.toLocaleString('ru-RU') ?? '—'}</InfoCell>
              <InfoCell label={t('itemDetail.published')}>{formatItemTimestamp(item?.published_date)}</InfoCell>
              <InfoCell label={t('itemDetail.refreshed')}>{formatItemTimestamp(item?.refreshed_date)}</InfoCell>
              <InfoCell label={t('itemDetail.edited')}>{formatItemTimestamp(item?.edit_date)}</InfoCell>
              <InfoCell label={t('common.date')}>{new Date(entry.created_at).toLocaleString()}</InfoCell>
              {initialPrice != null && (
                <InfoCell label={t('upload.accountsInitialPrice')}>
                  {initialPrice.toLocaleString('ru-RU')} ₽
                </InfoCell>
              )}
              {currentPrice != null && (
                <InfoCell label={t('upload.accountsCurrentPrice')}>
                  <span className={priceChanged ? 'lot-price-changed' : undefined}>
                    {currentPrice.toLocaleString('ru-RU')} ₽
                  </span>
                </InfoCell>
              )}
              {item?.price_currency && (
                <InfoCell label={t('itemDetail.currency')}>{item.price_currency.toUpperCase()}</InfoCell>
              )}
              {item?.priceWithSellerFeeLabel && (
                <InfoCell label={t('itemDetail.priceWithFee')}>{item.priceWithSellerFeeLabel}</InfoCell>
              )}
              {item?.itemOriginPhrase && (
                <InfoCell label={t('itemDetail.origin')}>{item.itemOriginPhrase}</InfoCell>
              )}
              {item?.guarantee?.durationPhrase && (
                <InfoCell label={t('itemDetail.guarantee')}>{item.guarantee.durationPhrase}</InfoCell>
              )}
              {item?.email_type && <InfoCell label={t('upload.emailType')}>{item.email_type}</InfoCell>}
              {item?.email_provider && <InfoCell label={t('itemDetail.emailProvider')}>{item.email_provider}</InfoCell>}
              {item?.item_domain && <InfoCell label={t('itemDetail.domain')}>{item.item_domain}</InfoCell>}
              {item?.is_sticky != null && item.is_sticky > 0 && (
                <InfoCell label={t('itemDetail.sticky')}>{t('itemDetail.yes')}</InfoCell>
              )}
              {item?.auto_bump_period != null && item.auto_bump_period > 0 && (
                <InfoCell label={t('itemDetail.autoBump')}>
                  {t('itemDetail.autoBumpHours', { hour: item.auto_bump_period })}
                </InfoCell>
              )}
              {priceChanged && entry.price_updated_at && (
                <div className="lot-info-cell lot-info-cell-wide">
                  <span>{t('upload.accountsPriceChanged')}</span>
                  <strong>{new Date(entry.price_updated_at).toLocaleString()}</strong>
                </div>
              )}
              {entry.message && (
                <div className="lot-info-cell lot-info-cell-wide">
                  <span>{t('common.message')}</span>
                  <strong>{entry.message}</strong>
                </div>
              )}
            </div>
          </section>

          {(item?.description || item?.description_en) && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('upload.description')}</h3>
              {item.description && <p className="lot-modal-note">{item.description}</p>}
              {item.description_en && (
                <p className="lot-modal-note lot-modal-note-muted">{item.description_en}</p>
              )}
            </section>
          )}

          {item?.information && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('upload.information')}</h3>
              <p className="lot-modal-note">{item.information}</p>
            </section>
          )}

          {categoryFields.length > 0 && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemDetail.accountData')}</h3>
              <div className="lot-info-grid lot-info-grid-dense">
                {categoryFields.map((field) => (
                  <InfoCell key={field.key} label={field.label}>
                    {field.value}
                  </InfoCell>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lot-modal-col lot-modal-col-side">
          {(item?.tags?.length || item?.public_tag) && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('tabs.tags')}</h3>
              <div className="lot-tag-list">
                {item?.tags?.map((tag) => (
                  <span key={tag.tag_id} className="lot-tag lot-tag-muted">
                    {tag.title}
                  </span>
                ))}
                {item?.public_tag && (
                  <span
                    className="lot-tag lot-tag-public"
                    style={item.public_tag.background_color ? { background: item.public_tag.background_color } : undefined}
                  >
                    {item.public_tag.title}
                  </span>
                )}
              </div>
            </section>
          )}

          {item?.seller && (
            <section className="lot-modal-panel lot-modal-panel-accent">
              <h3 className="lot-modal-panel-title">{t('itemDetail.seller')}</h3>
              <div className="lot-info-grid">
                <InfoCell label={t('itemDetail.sellerUsername')}>{item.seller.username ?? '—'}</InfoCell>
                <InfoCell label={t('itemDetail.soldCount')}>
                  {item.seller.sold_items_count?.toLocaleString('ru-RU') ?? '—'}
                </InfoCell>
                <InfoCell label={t('itemDetail.activeCount')}>
                  {item.seller.active_items_count?.toLocaleString('ru-RU') ?? '—'}
                </InfoCell>
                {item.seller.restore_percents != null && (
                  <InfoCell label={t('itemDetail.restorePercent')}>{item.seller.restore_percents}%</InfoCell>
                )}
              </div>
            </section>
          )}

          {(detail?.faveCount != null || detail?.sameItemsCount != null) && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemDetail.stats')}</h3>
              <div className="lot-info-grid">
                {detail.faveCount != null && (
                  <InfoCell label={t('itemDetail.favorites')}>{detail.faveCount}</InfoCell>
                )}
                {detail.sameItemsCount != null && (
                  <InfoCell label={t('itemDetail.sameItems')}>{detail.sameItemsCount}</InfoCell>
                )}
              </div>
            </section>
          )}

          {item?.accountLinks && item.accountLinks.length > 0 && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemDetail.links')}</h3>
              <div className="lot-link-list">
                {item.accountLinks.map((link) => {
                  let host = link.link
                  try {
                    host = new URL(link.link).hostname.replace(/^www\./, '')
                  } catch {

                  }
                  return (
                    <a
                      key={link.link}
                      href={link.link}
                      target="_blank"
                      rel="noreferrer"
                      className="lot-link-card"
                    >
                      <span className="lot-link-card-icon" aria-hidden="true">
                        <ExternalLink size={16} />
                      </span>
                      <span className="lot-link-card-body">
                        <strong>{link.text}</strong>
                        <span className="lot-link-card-url">{host}</span>
                      </span>
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {item?.note && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemTools.noteTitle')}</h3>
              <p className="lot-modal-note">{item.note}</p>
            </section>
          )}

          {item && (
            <section className="lot-modal-panel">
              <h3 className="lot-modal-panel-title">{t('itemDetail.permissions')}</h3>
              <div className="lot-perm-grid">
                {[
                  ['canEditItem', detail?.canEditItem ?? item.canEditItem],
                  ['canBumpItem', detail?.canBumpItem ?? item.canBumpItem],
                  ['canStickItem', detail?.canStickItem ?? item.canStickItem],
                  ['canCloseItem', detail?.canCloseItem ?? item.canCloseItem],
                  ['canOpenItem', detail?.canOpenItem ?? item.canOpenItem],
                  ['canDeleteItem', detail?.canDeleteItem ?? item.canDeleteItem],
                  ['canAutoBump', item.canAutoBump],
                  ['canValidateAccount', item.canValidateAccount]
                ].map(([key, allowed]) => (
                  <span
                    key={String(key)}
                    className={`lot-perm-chip ${allowed ? 'lot-perm-ok' : 'lot-perm-no'}`}
                  >
                    {t(`itemDetail.perm.${key}` as 'itemDetail.perm.canEditItem')}
                  </span>
                ))}
              </div>
              {item.canNotBumpItemReason && (
                <p className="lot-modal-muted">{item.canNotBumpItemReason}</p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
