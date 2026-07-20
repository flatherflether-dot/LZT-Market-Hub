import { getApiClient } from './api-client'
import type { BatchJob } from './constants'

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function buildBumpBatchJobs(itemIds: number[]): BatchJob[] {
  return itemIds.map((id) => ({ id: String(id), uri: `/${id}/bump`, method: 'POST' as const }))
}

export function buildOpenBatchJobs(itemIds: number[]): BatchJob[] {
  return itemIds.map((id) => ({
    id: String(id),
    uri: '/items/bulk-action',
    method: 'POST' as const,
    params: { action: 'open', item_ids: String(id) }
  }))
}

export function buildCloseBatchJobs(itemIds: number[]): BatchJob[] {
  return itemIds.map((id) => ({
    id: String(id),
    uri: '/items/bulk-action',
    method: 'POST' as const,
    params: { action: 'close', item_ids: String(id) }
  }))
}

export function buildEditPriceBatchJobs(itemIds: number[], price: string, currency = 'rub'): BatchJob[] {
  return itemIds.map((id) => ({
    id: String(id),
    uri: `/${id}/edit`,
    method: 'PUT' as const,
    params: { price, currency }
  }))
}

export function buildStickBatchJobs(itemIds: number[]): BatchJob[] {
  return itemIds.map((id) => ({ id: String(id), uri: `/${id}/stick`, method: 'POST' as const }))
}

export function buildUnstickBatchJobs(itemIds: number[]): BatchJob[] {
  return itemIds.map((id) => ({ id: String(id), uri: `/${id}/stick`, method: 'DELETE' as const }))
}

export function buildTagBatchJobs(itemIds: number[], tagId: number): BatchJob[] {
  return itemIds.map((id) => ({
    id: String(id),
    uri: `/${id}/tag/add`,
    method: 'POST' as const,
    params: { tag_id: String(tagId) }
  }))
}

export async function runBatchInChunks(
  jobs: BatchJob[],
  chunkSize = 10
): Promise<{ ok: number; failed: number }> {
  const client = getApiClient()
  let ok = 0
  let failed = 0
  for (const group of chunk(jobs, chunkSize)) {
    const { data } = await client.batchExecute(group)
    const results = (data as { jobs?: Record<string, { _job_result?: string; _job_error?: string }> }).jobs ?? {}
    for (const job of group) {
      const key = job.id ?? job.uri
      const row = results[key]
      if (row?._job_error) failed++
      else ok++
    }
  }
  return { ok, failed }
}

export function extractDiscountRequest(item: import('./constants').MarketItem): import('./constants').DiscountRequestInfo | null {
  const raw = item.discount_request ?? item.discountRequest
  if (!raw) return null
  const price = raw.requested_price ?? raw.requestedPrice ?? raw.price
  if (price === undefined && !raw.discount_id && !raw.discountId) return null
  return raw
}
