import clsx from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
  accent?: boolean
  style?: React.CSSProperties
  id?: string
}

export function Card({ title, description, children, className, actions, accent, style, id }: CardProps): ReactNode {
  return (
    <section id={id} className={clsx('secondaryContent card', className)} style={style}>
      {(title || actions) && (
        <header className={clsx('titleBar card-header', accent && 'titleBar-accent')}>
          <div className="card-header-text">
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="titleBar-desc card-description">{description}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}
