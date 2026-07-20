import type { ReactNode, CSSProperties } from 'react'

interface ContentTransitionProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function ContentTransition({
  children,
  className = 'content-transition',
  style
}: ContentTransitionProps): ReactNode {
  return <div className={className} style={style}>{children}</div>
}
