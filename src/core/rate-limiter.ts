import { RATE_LIMITS, type RateLimitBucket } from './constants'
import type { RateLimitInfo } from './constants'

interface BucketState {
  timestamps: number[]
  lastRequestAt: number
  serverResetAt?: number
}

export class RateLimiter {
  private buckets = new Map<RateLimitBucket, BucketState>()

  private getBucket(name: RateLimitBucket): BucketState {
    if (!this.buckets.has(name)) {
      this.buckets.set(name, { timestamps: [], lastRequestAt: 0 })
    }
    return this.buckets.get(name)!
  }

  applyServerFeedback(bucket: RateLimitBucket, info: RateLimitInfo): void {
    if (info.remaining === undefined || info.reset === undefined) return
    const state = this.getBucket(bucket)
    state.serverResetAt = info.remaining <= 0 ? info.reset * 1000 : undefined
  }

  async wait(bucket: RateLimitBucket): Promise<void> {
    const config = RATE_LIMITS[bucket]
    const state = this.getBucket(bucket)

    for (;;) {
      const now = Date.now()

      if (state.serverResetAt && now < state.serverResetAt) {
        await sleep(state.serverResetAt - now + 50)
        state.serverResetAt = undefined
        continue
      }

      state.timestamps = state.timestamps.filter((ts) => now - ts < config.windowMs)

      if ('minIntervalMs' in config && config.minIntervalMs) {
        const elapsed = now - state.lastRequestAt
        if (elapsed < config.minIntervalMs) {
          await sleep(config.minIntervalMs - elapsed)
          continue
        }
      }

      if (state.timestamps.length >= config.max) {
        const oldest = state.timestamps[0]
        const waitMs = config.windowMs - (now - oldest) + 50
        if (waitMs > 0) {
          await sleep(waitMs)
        }
        continue
      }

      const ts = Date.now()
      state.timestamps.push(ts)
      state.lastRequestAt = ts
      return
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const rateLimiter = new RateLimiter()
