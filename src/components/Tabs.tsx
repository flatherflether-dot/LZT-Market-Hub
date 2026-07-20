import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export interface TabDef<T extends string = string> {
  id: T
  label: string
  icon?: LucideIcon
  count?: number
}

interface TabsProps<T extends string> {
  tabs: TabDef<T>[]
  active: T
  onChange: (id: T) => void
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>): React.ReactNode {
  return (
    <ul className="tabs" role="tablist">
      {tabs.map(({ id, label, icon: Icon, count }) => (
        <li key={id} className={clsx(active === id && 'active')} role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
          >
            {Icon && <Icon size={14} />}
            <span>{label}</span>
            {count !== undefined && count > 0 && <span className="tab-count">{count}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
