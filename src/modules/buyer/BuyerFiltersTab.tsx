import { useState } from 'react'
import clsx from 'clsx'
import { Bookmark, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@components/Button'
import { Card } from '@components/Card'
import { useTranslation } from '@core/i18n'
import type { WatchFilter } from '@renderer/types/database'
import { getCategoryVisual } from '../upload/category-visuals'
import { filterParamLabel, parseFilterParams, sortFilterParams } from './buyer-filter-utils'
import { BuyerFilterModal } from './BuyerFilterModal'

export interface BuyerFiltersTabProps {
  filters: WatchFilter[]
  editingFilterId: number | null
  name: string
  setName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  pmin: string
  setPmin: (v: string) => void
  pmax: string
  setPmax: (v: string) => void
  extraParams: Record<string, string | number | boolean>
  setExtraParams: (v: Record<string, string | number | boolean>) => void
  onSelectFilter: (filter: WatchFilter) => void
  onNewFilter: () => void
  onSaveFilter: () => void | Promise<void>
  onPreviewFilter: () => void | Promise<void>
  onDeleteFilter: (id: number) => void
  onToggleFilterEnabled: (filter: WatchFilter) => void
}

export function BuyerFiltersTab(props: BuyerFiltersTabProps): React.ReactNode {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const isEditing = props.editingFilterId !== null

  function openCreateModal(): void {
    props.onNewFilter()
    setModalOpen(true)
  }

  function openEditModal(filter: WatchFilter): void {
    props.onSelectFilter(filter)
    setModalOpen(true)
  }

  function closeModal(): void {
    setModalOpen(false)
  }

  async function handleSave(): Promise<void> {
    await props.onSaveFilter()
    setModalOpen(false)
  }

  return (
    <div className="buyer-filters-hub">
      <Card
        title={t('buyer.savedFilters')}
        className="settings-form-card card-main buyer-filters-card"
        actions={
          <button
            type="button"
            className="buyer-filter-icon-btn buyer-filter-add-btn"
            title={t('buyer.newFilter')}
            aria-label={t('buyer.newFilter')}
            onClick={openCreateModal}
          >
            <Plus size={16} />
          </button>
        }
      >
        {props.filters.length === 0 ? (
          <div className="buyer-filters-empty">
            <p className="empty-state">{t('buyer.noFiltersHint')}</p>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus size={14} />
              {t('buyer.createFilter')}
            </Button>
          </div>
        ) : (
          <ul className="buyer-filter-list">
            {props.filters.map((filter) => {
              const visual = getCategoryVisual(filter.category)
              const params = sortFilterParams(parseFilterParams(filter.params_json))
              const enabled = Boolean(filter.is_enabled)
              return (
                <li
                  key={filter.id}
                  className={clsx('buyer-filter-item', !enabled && 'is-disabled')}
                  style={{ '--filter-accent': visual.accent } as React.CSSProperties}
                >
                  <div className="buyer-filter-item-icon" style={{ background: visual.gradient }}>
                    {visual.logoUrl ? (
                      <img src={visual.logoUrl} alt="" className="buyer-listing-logo" />
                    ) : (
                      <Bookmark size={16} />
                    )}
                  </div>

                  <button
                    type="button"
                    className="buyer-filter-item-body"
                    onClick={() => openEditModal(filter)}
                  >
                    <div className="buyer-filter-item-head">
                      <span className="buyer-filter-item-name">{filter.name}</span>
                      <span className="buyer-filter-category">{visual.label}</span>
                      {!enabled && (
                        <span className="buyer-filter-status">{t('common.off')}</span>
                      )}
                    </div>
                    {params.length > 0 && (
                      <div className="buyer-filter-params">
                        {params.slice(0, 6).map(([key, value]) => (
                          <span key={key} className="buyer-filter-param">
                            <span className="buyer-filter-param-key">{filterParamLabel(key, t)}</span>
                            <span className="buyer-filter-param-val">{value}</span>
                          </span>
                        ))}
                        {params.length > 6 && (
                          <span className="buyer-filter-param is-more">
                            +{params.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  <div className="buyer-filter-item-actions">
                    <button
                      type="button"
                      className="buyer-filter-icon-btn"
                      title={enabled ? t('common.off') : t('common.on')}
                      onClick={() => void props.onToggleFilterEnabled(filter)}
                    >
                      {enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      type="button"
                      className="buyer-filter-icon-btn is-danger"
                      title={t('common.delete')}
                      onClick={() => void props.onDeleteFilter(filter.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <BuyerFilterModal
        open={modalOpen}
        onClose={closeModal}
        isEditing={isEditing}
        name={props.name}
        setName={props.setName}
        category={props.category}
        setCategory={props.setCategory}
        pmin={props.pmin}
        setPmin={props.setPmin}
        pmax={props.pmax}
        setPmax={props.setPmax}
        extraParams={props.extraParams}
        setExtraParams={props.setExtraParams}
        onSave={handleSave}
        onPreview={props.onPreviewFilter}
      />
    </div>
  )
}
