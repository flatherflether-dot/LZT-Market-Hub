import type { Deal } from '@renderer/types/database'

export type PlPeriod = 'day' | 'week' | 'month' | 'all'

export interface PlReport {
  period: PlPeriod
  dealCount: number
  totalMargin: number
  totalBuy: number
  totalSell: number
  avgMargin: number
  bySource: Array<{ source: string; margin: number; count: number }>
  byCategory: Array<{ category: string; margin: number; count: number }>
  daily: Array<{ date: string; margin: number; count: number }>
}

function periodStart(period: PlPeriod): Date | null {
  if (period === 'all') return null
  const now = new Date()
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  const d = new Date(now)
  d.setMonth(d.getMonth() - 1)
  return d
}

export function filterDealsByPeriod(deals: Deal[], period: PlPeriod): Deal[] {
  const start = periodStart(period)
  if (!start) return deals
  return deals.filter((d) => new Date(d.created_at) >= start)
}

export function buildPlReport(deals: Deal[], period: PlPeriod): PlReport {
  const filtered = filterDealsByPeriod(deals, period)
  const totalMargin = filtered.reduce((s, d) => s + (d.margin ?? 0), 0)
  const totalBuy = filtered.reduce((s, d) => s + (d.buy_price ?? 0), 0)
  const totalSell = filtered.reduce((s, d) => s + (d.sell_price ?? 0), 0)

  const sourceMap = new Map<string, { margin: number; count: number }>()
  const categoryMap = new Map<string, { margin: number; count: number }>()
  const dailyMap = new Map<string, { margin: number; count: number }>()

  for (const d of filtered) {
    const source = d.source ?? d.action ?? 'other'
    const cat = d.category ?? 'other'
    const day = d.created_at.slice(0, 10)

    for (const [map, key] of [
      [sourceMap, source],
      [categoryMap, cat]
    ] as const) {
      const cur = map.get(key) ?? { margin: 0, count: 0 }
      cur.margin += d.margin ?? 0
      cur.count++
      map.set(key, cur)
    }

    const dayCur = dailyMap.get(day) ?? { margin: 0, count: 0 }
    dayCur.margin += d.margin ?? 0
    dayCur.count++
    dailyMap.set(day, dayCur)
  }

  return {
    period,
    dealCount: filtered.length,
    totalMargin,
    totalBuy,
    totalSell,
    avgMargin: filtered.length ? totalMargin / filtered.length : 0,
    bySource: [...sourceMap.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.margin - a.margin),
    byCategory: [...categoryMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.margin - a.margin),
    daily: [...dailyMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}

export function buildDealChains(deals: Deal[]): Array<{ itemId: number; steps: Deal[] }> {
  const byItem = new Map<number, Deal[]>()
  for (const d of deals) {
    if (!d.item_id) continue
    const list = byItem.get(d.item_id) ?? []
    list.push(d)
    byItem.set(d.item_id, list)
  }
  return [...byItem.entries()]
    .map(([itemId, steps]) => ({
      itemId,
      steps: steps.sort((a, b) => a.created_at.localeCompare(b.created_at))
    }))
    .filter((c) => c.steps.length > 1)
}
