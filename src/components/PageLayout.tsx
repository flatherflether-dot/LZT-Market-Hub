import type { ReactNode } from 'react'
import { ContentTransition } from '@components/ContentTransition'

interface StatTileProps {
  label: string
  value: ReactNode
  badge?: ReactNode
}

export function StatTile({ label, value, badge }: StatTileProps): ReactNode {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      {badge && <div className="stat-tile-badge">{badge}</div>}
    </div>
  )
}

interface PageLayoutProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  tabs?: ReactNode
  banner?: ReactNode
  gridTop?: ReactNode
  main: ReactNode
  aside?: ReactNode
  stats?: StatTileProps[]
  footer?: ReactNode
  fullHeight?: boolean
}

export function PageLayout({
  title,
  subtitle,
  badge,
  tabs,
  banner,
  gridTop,
  main,
  aside,
  stats,
  footer,
  fullHeight
}: PageLayoutProps): ReactNode {
  return (
    <div className="page">
      <div className="page-top">
        <header className="page-module-header">
          <div>
            <h1 className="page-module-title">{title}</h1>
            {subtitle && <p className="page-module-subtitle">{subtitle}</p>}
          </div>
          {badge && <div className="page-module-badge">{badge}</div>}
        </header>

        {tabs}
        {banner}
      </div>

      <div className={`page-scroll-body ${fullHeight ? 'page-scroll-body-full' : ''}`}>
        {gridTop && <div className="page-grid-top">{gridTop}</div>}
        <div className={aside ? 'page-layout' : 'page-layout page-layout-single'} style={fullHeight ? { flex: 1, minHeight: 0, alignItems: 'stretch' } : undefined}>
          <div className="page-main-col" style={fullHeight ? { flex: 1, minHeight: 0 } : undefined}>
            <ContentTransition style={fullHeight ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
              {main}
            </ContentTransition>
            {stats && stats.length > 0 && (
              <div className="page-stat-row">
                {stats.map((stat) => (
                  <StatTile key={stat.label} {...stat} />
                ))}
              </div>
            )}
            {footer}
          </div>
          {aside && (
            <aside className="page-aside-col" style={fullHeight ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined}>
              <ContentTransition className="content-transition content-transition-aside" style={fullHeight ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
                {aside}
              </ContentTransition>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
