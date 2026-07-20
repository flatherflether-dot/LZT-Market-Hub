import {
  SlidersHorizontal,
  ShieldCheck,
  Puzzle,
  UploadCloud,
  ListOrdered,
  Package,
  History,
  BookText,
  ArrowRightLeft,
  AlertTriangle,
  Radar,
  ListFilter,
  Star,
  ShoppingCart,
  Percent,
  Eye,
  ListChecks,
  Layers,
  Tag,
  LayoutDashboard,
  Wallet,
  Users,
  Plug,
  Wrench,
  Activity,
  Bot,
  Repeat,
  type LucideIcon
} from 'lucide-react'
import type { TranslationKey } from '@core/i18n'
import type { AnalyticsSectionId } from '@core/module-types'

export interface SidebarNestedItem {
  id: string
  labelKey: TranslationKey
  icon: LucideIcon
  param: string
  module?: string
  bridge?: string
  analyticsSection?: AnalyticsSectionId
}

export const SIDEBAR_NESTED: Record<string, SidebarNestedItem[]> = {
  '/upload': [
    { id: 'upload', labelKey: 'tabs.upload', icon: UploadCloud, param: 'upload' },
    { id: 'queue', labelKey: 'tabs.queue', icon: ListOrdered, param: 'queue' },
    { id: 'accounts', labelKey: 'tabs.accounts', icon: Package, param: 'accounts' },
    { id: 'history', labelKey: 'tabs.history', icon: History, param: 'history' }
  ],
  '/reseller': [
    { id: 'journal', labelKey: 'tabs.journal', icon: BookText, param: 'journal' },
    { id: 'transfer', labelKey: 'tabs.transfer', icon: ArrowRightLeft, param: 'transfer' },
    { id: 'claims', labelKey: 'tabs.claims', icon: AlertTriangle, param: 'claims' }
  ],
  '/buyer': [
    { id: 'monitor', labelKey: 'tabs.monitor', icon: Radar, param: 'monitor' },
    { id: 'filters', labelKey: 'tabs.filters', icon: ListFilter, param: 'filters' },
    { id: 'watchlist', labelKey: 'tabs.watchlist', icon: Star, param: 'watchlist' },
    { id: 'cart', labelKey: 'tabs.cart', icon: ShoppingCart, param: 'cart' },
    { id: 'purchases', labelKey: 'tabs.purchases', icon: Package, param: 'purchases' },
    { id: 'discounts', labelKey: 'tabs.discounts', icon: Percent, param: 'discounts' },
    { id: 'viewed', labelKey: 'tabs.viewed', icon: Eye, param: 'viewed' }
  ],
  '/automation': [
    { id: 'tasks', labelKey: 'tabs.tasks', icon: ListChecks, param: 'tasks' },
    { id: 'buyer', labelKey: 'tabs.buyerAutomation', icon: Bot, param: 'buyer' },
    { id: 'bulk', labelKey: 'tabs.bulk', icon: Layers, param: 'bulk' },
    { id: 'tags', labelKey: 'tabs.tags', icon: Tag, param: 'tags' }
  ],
  '/analytics': [
    { id: 'overview', labelKey: 'tabs.overview', icon: LayoutDashboard, param: 'overview' },
    {
      id: 'competitors',
      labelKey: 'tabs.competitors',
      icon: Users,
      param: 'competitors',
      bridge: 'competitor_tracking'
    }
  ],
  '/finance': [
    { id: 'overview', labelKey: 'tabs.financeOverview', icon: Wallet, param: 'overview' },
    { id: 'payments', labelKey: 'tabs.financePayments', icon: History, param: 'payments' },
    { id: 'autopay', labelKey: 'tabs.financeAutopay', icon: Repeat, param: 'autopay' },
    { id: 'transfer', labelKey: 'finance.transferTab', icon: ArrowRightLeft, param: 'transfer' }
  ],
  '/tools': [
    { id: 'integrations', labelKey: 'tabs.integrations', icon: Plug, param: 'integrations' },
    { id: 'utilities', labelKey: 'tabs.utilities', icon: Wrench, param: 'utilities' },
    { id: 'activity', labelKey: 'tabs.activity', icon: Activity, param: 'activity' }
  ],
  '/settings': [
    { id: 'general', labelKey: 'tabs.general', icon: SlidersHorizontal, param: 'general' },
    { id: 'modules', labelKey: 'tabs.modules', icon: Puzzle, param: 'modules' },
    { id: 'security', labelKey: 'tabs.security', icon: ShieldCheck, param: 'security' }
  ]
}

export function getNestedNav(path: string): SidebarNestedItem[] | undefined {
  return SIDEBAR_NESTED[path]
}

export function filterNestedNav(
  items: SidebarNestedItem[],
  enabled: Record<string, boolean>,
  isBridgeActive: (bridgeId: string, mods: Record<string, boolean>) => boolean,
  isAnalyticsSectionVisible: (sectionId: AnalyticsSectionId, mods: Record<string, boolean>) => boolean
): SidebarNestedItem[] {
  return items.filter((item) => {
    if (item.module && enabled[item.module] === false) return false
    if (item.bridge && !isBridgeActive(item.bridge, enabled)) return false
    if (item.analyticsSection && !isAnalyticsSectionVisible(item.analyticsSection, enabled)) return false
    return true
  })
}

export function isNestedNavPath(path: string): boolean {
  return path in SIDEBAR_NESTED
}
