/**
 * Minimal in-process sliding-window rate limiter.
 *
 * Good enough to blunt credential stuffing / invite spam on a single instance.
 * It is NOT shared across instances — put a real limiter (nginx `limit_req`,
 * Cloudflare, a Redis token bucket) in front for a multi-node deployment.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
   /** window length in ms */
   windowMs: number;
   /** max hits allowed within the window */
   max: number;
}

/** Returns true when the caller is allowed, false when they're over the limit. */
export function rateLimit(key: string, { windowMs, max }: RateLimitOptions): boolean {
   const now = Date.now();
   const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
   hits.push(now);
   buckets.set(key, hits);

   // opportunistic cleanup so the map doesn't grow unbounded
   if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
         if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
      }
   }
   return hits.length <= max;
}

/** Convenience: throws a redirect-friendly sentinel when over the limit. */
export class RateLimitError extends Error {
   constructor() {
      super('too many requests');
   }
}
