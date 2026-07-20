import type { RateLimitBucket, RateLimitInfo } from './constants'
import { rateLimiter } from './rate-limiter'

interface SystemInfoBody {
  system_info?: {
    rate_limit?: RateLimitInfo
  }
}

export function mapApiBucketToLocal(apiBucket?: string): RateLimitBucket | undefined {
  if (!apiBucket) return undefined
  const b = apiBucket.toLowerCase()
  if (b.includes('search')) return 'search'
  if (b.includes('letter')) return 'letters'
  if (b.includes('edit')) return 'edit'
  if (b.includes('tag')) return 'tags'
  if (b.includes('batch')) return 'batch'
  if (b.includes('check') || b.includes('account')) return 'checkAccount'
  if (b === 'post' || b.includes('mutate')) return 'baseMutate'
  return 'baseGet'
}

export function extractRateLimitFromBody(json: unknown): RateLimitInfo | undefined {
  const info = (json as SystemInfoBody)?.system_info?.rate_limit
  if (!info || info.limit === undefined) return undefined
  return info
}

export function mergeRateLimit(headers?: RateLimitInfo, body?: RateLimitInfo): RateLimitInfo | undefined {
  if (body?.limit !== undefined && body.limit > 0) {
    return { ...headers, ...body, bucket: body.bucket ?? headers?.bucket }
  }
  return headers
}

export function applyRateLimitFeedback(info: RateLimitInfo | undefined): void {
  if (!info) return
  const local = mapApiBucketToLocal(info.bucket)
  if (local) {
    rateLimiter.applyServerFeedback(local, info)
  }
}
