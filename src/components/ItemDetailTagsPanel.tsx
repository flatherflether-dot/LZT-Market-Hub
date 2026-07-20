import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@components/Button'
import { Select } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketItemDetail, MarketTag } from '@core/constants'
import { useTranslation } from '@core/i18n'

interface ItemDetailTagsPanelProps {
  itemId: number
  item?: MarketItemDetail
  onChanged: () => Promise<void>
}

export function ItemDetailTagsPanel({ itemId, item, onChanged }: ItemDetailTagsPanelProps): React.ReactNode {
  const { t } = useTranslation()
  const [allTags, setAllTags] = useState<MarketTag[]>([])
  const [selectedTagId, setSelectedTagId] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadTags(): Promise<void> {
    try {
      const { data } = await getApiClient().listTags<{ tags?: MarketTag[] }>()
      setAllTags(data.tags ?? [])
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    }
  }

  useEffect(() => {
    void loadTags()
  }, [])

  async function addTag(): Promise<void> {
    const tagId = Number(selectedTagId)
    if (!Number.isFinite(tagId)) return
    setBusy(true)
    try {
      await getApiClient().addTagToItem(itemId, tagId)
      setSelectedTagId('')
      setStatus(t('itemDetail.tagAdded'))
      await onChanged()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function removeTag(tagId: number): Promise<void> {
    setBusy(true)
    try {
      await getApiClient().removeTagFromItem(itemId, tagId)
      setStatus(t('itemDetail.tagRemoved'))
      await onChanged()
    } catch (e) {
      setStatus(e instanceof LztApiError ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const currentTagIds = new Set(item?.tags?.map((tag) => tag.tag_id) ?? [])
  const availableTags = allTags.filter((tag) => !currentTagIds.has(tag.tag_id))

  return (
    <div className="lot-modal-tab-pane lot-tags-tab">
      <div className="lot-modal-grid lot-tags-grid">
        <section className="lot-modal-panel lot-modal-col-main">
          <h3 className="lot-modal-panel-title">{t('itemDetail.currentTags')}</h3>
          {item?.tags?.length ? (
            <div className="lot-tag-chip-list">
              {item.tags.map((tag) => (
                <div key={tag.tag_id} className="lot-tag-chip">
                  <span>{tag.title}</span>
                  <button
                    type="button"
                    className="lot-tag-chip-remove"
                    onClick={() => void removeTag(tag.tag_id)}
                    disabled={busy}
                    aria-label={t('common.delete')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="lot-modal-muted">{t('itemDetail.noTags')}</p>
          )}

          {item?.public_tag && (
            <div className="lot-tags-public">
              <span className="lot-modal-panel-title">{t('itemDetail.publicTag')}</span>
              <span
                className="lot-tag lot-tag-public"
                style={
                  item.public_tag.background_color
                    ? { background: item.public_tag.background_color }
                    : undefined
                }
              >
                {item.public_tag.title}
              </span>
            </div>
          )}
        </section>

        <aside className="lot-modal-panel lot-modal-col-side lot-tags-add-panel">
          <h3 className="lot-modal-panel-title">{t('itemDetail.addTag')}</h3>
          {availableTags.length > 0 ? (
            <div className="lot-tags-add-form">
              <Select
                label={t('itemDetail.selectTag')}
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                options={[
                  { value: '', label: t('itemDetail.selectTag') },
                  ...availableTags.map((tag) => ({ value: String(tag.tag_id), label: tag.title }))
                ]}
              />
              <Button onClick={() => void addTag()} disabled={busy || !selectedTagId}>
                {t('itemDetail.addTagBtn')}
              </Button>
            </div>
          ) : (
            <p className="lot-modal-muted">{t('itemDetail.noTagsAvailable')}</p>
          )}
        </aside>
      </div>

      {status && <p className="lot-modal-status">{status}</p>}
    </div>
  )
}
