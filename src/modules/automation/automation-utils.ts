import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpCircle,
  Clock,
  Layers,
  Percent,
  Sparkles,
  Target,
  Users,
  XCircle
} from 'lucide-react'

export function formatTaskInterval(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

export function getTaskVisual(type: string): { icon: LucideIcon; color: string; bg: string } {
  switch (type) {
    case 'auto_bump_single':
    case 'bulk_bump':
      return {
        icon: ArrowUpCircle,
        color: '#00ba78',
        bg: 'rgba(0, 186, 120, 0.12)'
      }
    case 'auto_reprice_stale':
    case 'auto_reprice':
      return {
        icon: Percent,
        color: '#ffc506',
        bg: 'rgba(255, 197, 6, 0.12)'
      }
    case 'smart_reprice_stale':
      return {
        icon: Sparkles,
        color: '#7c5cff',
        bg: 'rgba(124, 92, 255, 0.12)'
      }
    case 'sync_competitor_listings':
      return {
        icon: Users,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)'
      }
    case 'competitor_undercut_reprice':
      return {
        icon: Target,
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.12)'
      }
    case 'bulk_close':
      return {
        icon: XCircle,
        color: '#f87171',
        bg: 'rgba(248, 113, 113, 0.12)'
      }
    case 'bulk_open':
      return {
        icon: Layers,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)'
      }
    default:
      return {
        icon: Clock,
        color: '#888',
        bg: 'rgba(255, 255, 255, 0.06)'
      }
  }
}
