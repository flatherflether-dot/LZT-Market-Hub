import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import { Inbox, Pencil, Plus, RefreshCw, Tag, Trash2, Zap } from 'lucide-react'
import { Button } from '@components/Button'
import { Input } from '@components/FormFields'
import { getApiClient, LztApiError } from '@core/api-client'
import type { MarketTag } from '@core/constants'
import { useTranslation } from '@core/i18n'
import { useAutoRefresh } from '@core/use-auto-refresh'

function isTokenError(message: string): boolean {
  return message.toLowerCase().includes('token')
}

export function TagManagerPanel(): React.ReactNode {
  const { t } = useTranslation()
  const [tags, setTags] = useState<MarketTag[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    if (!silent) setStatus(null)
    try {
      const { data } = await getApiClient().listTags()
      setTags(data.tags ?? [])
    } catch (e) {
      if (!silent) {
        const message = e instanceof LztApiError ? e.message : t('common.error')
        setStatus(message)
        setStatusKind('error')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useAutoRefresh(() => refresh(true), [refresh])

  async function createTag(): Promise<void> {
    if (!newTitle.trim()) return
    setCreating(true)
    setStatus(null)
    try {
      await getApiClient().createTag(newTitle.trim())
      setNewTitle('')
      await refresh(false)
      setStatus(t('tags.created'))
      setStatusKind('success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    } finally {
      setCreating(false)
    }
  }

  async function saveEdit(): Promise<void> {
    if (!editId || !editTitle.trim()) return
    try {
      await getApiClient().updateTag(editId, editTitle.trim())
      setEditId(null)
      await refresh(false)
      setStatus(t('tags.updated'))
      setStatusKind('success')
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    }
  }

  async function removeTag(tagId: number): Promise<void> {
    try {
      await getApiClient().deleteTag(tagId)
      if (editId === tagId) setEditId(null)
      await refresh(false)
    } catch (e) {
      const message = e instanceof LztApiError ? e.message : t('common.error')
      setStatus(message)
      setStatusKind('error')
    }
  }

  function cancelEdit(): void {
    setEditId(null)
    setEditTitle('')
  }

  return (
    <div className="automation-hub">
      <section className="automation-section automation-tags-card">
        <header className="automation-tasks-head">
          <div className="automation-tasks-head-main">
            <div className="automation-tasks-head-icon">
              <Tag size={18} />
            </div>
            <div>
              <h3>{t('tags.managerTitle')}</h3>
              <p>{t('tags.managerDesc')}</p>
            </div>
          </div>
          <div className="automation-tags-toolbar">
            <span className="automation-tags-count-badge" title={t('tags.managerTitle')}>
              {tags.length}
            </span>
          </div>
        </header>

        <div className="automation-tags-body">
          <div className="automation-tags-panel">
            <span className="automation-tags-panel-label">{t('tags.newTag')}</span>
            <div className="automation-tags-create">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t('tags.newTag')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void createTag()
                }}
              />
              <Button
                className="automation-tags-create-btn"
                onClick={() => void createTag()}
                disabled={!newTitle.trim() || creating}
              >
                <Plus size={14} />
                {creating ? '…' : t('tags.create')}
              </Button>
            </div>
          </div>

          {tags.length === 0 ? (
            <div className="automation-tags-empty">
              {loading ? <RefreshCw size={40} className="spin-icon" /> : <Inbox size={40} />}
              <div>
                <p>{loading ? t('layout.loadingProfile') : t('tags.empty')}</p>
                {!loading && <span>{t('tags.newTag')}</span>}
              </div>
            </div>
          ) : (
            <div className="automation-tags-list">
              {tags.map((tag) => {
                const editing = editId === tag.tag_id

                return (
                  <article key={tag.tag_id} className="automation-tag-row">
                    <div className="automation-tag-icon">
                      <Tag size={16} />
                    </div>

                    <div className="automation-tag-body">
                      {editing ? (
                        <Input
                          className="automation-tag-edit-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        <div className="automation-tag-head">
                          <span className="automation-tag-title">{tag.title}</span>
                          <span className="automation-tag-id">#{tag.tag_id}</span>
                        </div>
                      )}
                    </div>

                    <div className="automation-tag-actions">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="automation-tag-icon-btn is-primary"
                            title={t('common.save')}
                            disabled={!editTitle.trim()}
                            onClick={() => void saveEdit()}
                          >
                            {t('common.save')}
                          </button>
                          <button
                            type="button"
                            className="automation-tag-icon-btn"
                            title={t('common.cancel')}
                            onClick={cancelEdit}
                          >
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="automation-tag-icon-btn"
                            title={t('tags.edit')}
                            onClick={() => {
                              setEditId(tag.tag_id)
                              setEditTitle(tag.title)
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="automation-tag-icon-btn is-danger"
                            title={t('common.delete')}
                            onClick={() => void removeTag(tag.tag_id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {status && (
            <div
              className={clsx(
                'automation-status-banner',
                statusKind === 'success' && 'is-success',
                statusKind === 'error' && 'is-error'
              )}
            >
              <Zap size={14} />
              {isTokenError(status) ? t('layout.apiOfflineHint') : status}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
