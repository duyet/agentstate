/**
 * analytics-cache.ts — Cache key + invalidation for the dashboard analytics
 * endpoint (`GET /v1/projects/:id/analytics`, see routes/analytics.ts).
 *
 * Results are cached in AUTH_CACHE per project+range for 60-300s. The range
 * affected by a given write isn't known ahead of time, so a write busts all
 * ranges for the project.
 */

import type { ExecutionContext } from "hono";

/** Time ranges the analytics endpoint caches (see routes/analytics.ts). */
export const ANALYTICS_CACHE_RANGES = ["7d", "30d", "90d"] as const;

/** Build the AUTH_CACHE key used by the dashboard analytics endpoint. */
export function analyticsCacheKey(projectId: string, range: string): string {
  return `analytics:public:${projectId}:${range}`;
}

/**
 * Bust cached analytics for a project across all ranges. Call after any
 * write that changes conversation/message counts (create, delete) so the
 * dashboard doesn't serve stale aggregates for up to the cache TTL.
 */
export function invalidateAnalyticsCache(
  cache: KVNamespace | undefined,
  executionCtx: ExecutionContext,
  projectId: string,
): void {
  if (!cache) return;
  executionCtx.waitUntil(
    Promise.all(
      ANALYTICS_CACHE_RANGES.map((range) => cache.delete(analyticsCacheKey(projectId, range))),
    ),
  );
}
