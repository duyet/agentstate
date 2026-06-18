/**
 * config.ts — Single source of truth for tunable runtime constants.
 *
 * Every constant exported here is the authoritative value referenced by its
 * call sites (no shadow copies left hardcoded elsewhere). Group by concern and
 * keep values "boring": they should change only when product/ops policy changes,
 * not during routine refactors.
 *
 * Note: auth/rate-limit constants are deliberately NOT centralized here — those
 * live next to their security-critical logic and are changed under human review.
 */

// ---------------------------------------------------------------------------
// Leases
// ---------------------------------------------------------------------------

/** Default lease TTL (ms) when the caller omits `ttl_ms`. */
export const LEASE_DEFAULT_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Cache TTLs (seconds)
// ---------------------------------------------------------------------------

/** Short-lived cache TTL — 1 minute. Used for short analytics periods. */
export const CACHE_TTL_SHORT_S = 60;

/** Medium cache TTL — 3 minutes. */
export const CACHE_TTL_MEDIUM_S = 180;

/** Long cache TTL — 5 minutes. Used for long analytics periods. */
export const CACHE_TTL_LONG_S = 300;

/** TTL for conversation-count cache entries — 1 minute. */
export const CACHE_COUNT_TTL_S = 60;

// ---------------------------------------------------------------------------
// Retention / Scheduled cleanup
// ---------------------------------------------------------------------------

/** Maximum conversations deleted per batch in the retention cleanup job. */
export const RETENTION_BATCH_SIZE = 500;

/**
 * Per-invocation time budget (ms) for the retention cleanup scheduled handler.
 * Keeps us safely under the Workers 30s wall-clock limit.
 */
export const RETENTION_TIME_BUDGET_MS = 25_000;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Milliseconds per day — used when converting `retention_days`/ranges to cutoffs. */
export const MS_PER_DAY = 86_400_000;
