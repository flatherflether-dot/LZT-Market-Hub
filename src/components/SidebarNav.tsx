import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from '@core/i18n'
import { CORE_MODULES, OPTIONAL_MODULES } from '@core/module-loader'
import { resolveSidebarCategories } from '@core/sidebar-categories'
import { filterNestedNav, getNestedNav } from '@core/sidebar-nested'
import { isAnalyticsSectionVisible, isBridgeActive } from '@core/module-registry'
import { useModulesStore } from '@core/modules-store'
import type { LoadedModule } from '@core/module-types'
import { SidebarFooter } from '@components/SidebarFooter'

function nestedTabLink(path: string, param: string): string {
  return `${path}?tab=${param}`
}

function SidebarNavItem({
  mod,
  enabled,
  activeTab
}: {
  mod: LoadedModule
  enabled: Record<string, boolean | undefined>
  activeTab: string | null
}): React.ReactNode {
  const { t } = useTranslation()
  const location = useLocation()
  const { path: to, navKey: key, icon: Icon, end } = mod

  const nestedRaw = getNestedNav(to)
  const nested = nestedRaw
    ? filterNestedNav(nestedRaw, enabled as Record<string, boolean>, isBridgeActive, isAnalyticsSectionVisible)
    : undefined
  const onSection = location.pathname === to || location.pathname.startsWith(`${to}/`)
  const sectionTab = activeTab ?? nested?.[0]?.param
  const hasNested = Boolean(nested && nested.length > 0)
  const parentOpen = onSection && hasNested

  const activeChild = nested?.find((child) => sectionTab === child.param)

  return (
    <div
      className={clsx(
        'sidebar-nav-group',
        parentOpen && 'sidebar-nav-group-open',
        parentOpen && activeChild && 'sidebar-nav-group-active'
      )}
    >
      <NavLink
        to={hasNested ? nestedTabLink(to, nested![0].param) : to}
        end={end && !hasNested}
        className={({ isActive }) =>
          clsx(
            'sidebar-nav-item',
            parentOpen && 'sidebar-nav-item-open',
            !parentOpen && (isActive || onSection) && 'sidebar-nav-item-active'
          )
        }
      >
        <span className="sidebar-nav-item-icon" aria-hidden="true">
          <Icon size={16} className="sidebar-nav-item-icon-svg" />
        </span>
        <span className="sidebar-nav-item-label">{t(key as Parameters<typeof t>[0])}</span>
      </NavLink>

      {nested && nested.length > 0 && (
        <div className={clsx('sidebar-nav-nested', onSection && 'sidebar-nav-nested-open')}>
          <div className="sidebar-nav-nested-inner">
            {nested.map((child) => (
              <NavLink
                key={child.id}
                to={nestedTabLink(to, child.param)}
                className={clsx(
                  'sidebar-nav-subitem',
                  sectionTab === child.param && 'sidebar-nav-subitem-active'
                )}
              >
                <child.icon size={14} aria-hidden="true" />
                <span>{t(child.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SidebarNav(): React.ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const enabled = useModulesStore((s) => s.enabled)
  const activeTab = searchParams.get('tab')

  const categories = useMemo(
    () => resolveSidebarCategories(CORE_MODULES, OPTIONAL_MODULES, enabled),
    [enabled]
  )

  return (
    <aside className="app-sidebar" aria-label={t('layout.appTitle')}>
      <div className="sidebar-drag" aria-hidden="true" />

      <nav className="sidebar-nav">
        {categories.map(({ labelKey, modules }, index) => (
          <section
            key={labelKey}
            className={clsx(
              'sidebar-nav-section',
              index === 0 && 'sidebar-nav-section-first'
            )}
            aria-label={t(labelKey)}
          >
            {modules.length > 0 && (
              <p className="sidebar-nav-section-label">{t(labelKey)}</p>
            )}
            <div className="sidebar-nav-section-items">
              {modules.map((mod) => (
                <SidebarNavItem key={mod.path} mod={mod} enabled={enabled} activeTab={activeTab} />
              ))}
            </div>
          </section>
        ))}
      </nav>

      <SidebarFooter />
    </aside>
  )
}
