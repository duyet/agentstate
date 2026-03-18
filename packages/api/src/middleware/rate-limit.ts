import { and, eq, lt, sql } from "drizzle-orm";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { nanoid } from "nanoid";
import { rateLimits } from "../db/schema";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum requests allowed per window. */
const RATE_LIMIT = 100;

/** Window size in milliseconds (60 seconds). */
const WINDOW_MS = 60_000;

/** Prune rows older than 2× the window to keep the table bounded. */
const PRUNE_OLDER_THAN_MS = WINDOW_MS * 2;

// ---------------------------------------------------------------------------
// Sliding Window State Interface
// ---------------------------------------------------------------------------

interface SlidingWindowState {
  /** SHA-256 hash of the API key */
  apiKeyHash: string;
  /** Sorted array of request timestamps (milliseconds since epoch) */
  timestamps: number[];
}

// ---------------------------------------------------------------------------
// Sliding Window Rate Limiter (Workers KV)
// ---------------------------------------------------------------------------
// Algorithm: Track individual request timestamps in a rolling window.
// Count requests where timestamp > (now - window_size).
// Prevents the fixed-window boundary bypass (2× burst at window transitions).
//
// Fallback: Falls back to D1 fixed-window if KV is not configured.
// ---------------------------------------------------------------------------

type SlidingWindowResult = { allowed: boolean; count: number; retryAfter: number } | null;

const slidingWindowRateLimit = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  apiKeyHash: string,
  now: number,
): Promise<SlidingWindowResult> => {
  const kv = c.env.RATE_LIMITS;
  if (!kv) {
    // KV not configured, fall through to D1 implementation
    return null;
  }

  const key = `ratelimit:${apiKeyHash}`;
  const cutoff = now - WINDOW_MS;

  // Get current state from KV
  const stateJson = await kv.get(key, "json");
  const state: SlidingWindowState = (stateJson as SlidingWindowState | null) ?? {
    apiKeyHash,
    timestamps: [],
  };

  // Filter out expired timestamps (keep only requests within window)
  state.timestamps = state.timestamps.filter((t) => t > cutoff);
  const count = state.timestamps.length;

  if (count >= RATE_LIMIT) {
    // Rate limit exceeded — calculate retry-after based on oldest request
    const oldestTimestamp = state.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);
    return { allowed: false, count, retryAfter };
  }

  // Record this request and save to KV
  state.timestamps.push(now);
  // Sort to ensure binary search works if we optimize later
  state.timestamps.sort((a, b) => a - b);

  // Auto-expire after 2 minutes (2x window size) to prevent stale data
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: Math.floor((WINDOW_MS * 2) / 1000),
  });

  return { allowed: true, count: count + 1, retryAfter: 0 };
};

// ---------------------------------------------------------------------------
// Fixed Window Rate Limiter (D1 / SQLite)
// ---------------------------------------------------------------------------
// Algorithm: fixed-window counter keyed by (api_key_hash, window_start).
// window_start is floored to the current 60-second boundary so that every
// key gets exactly RATE_LIMIT requests per UTC minute.
//
// Trade-off vs. a true sliding window: a caller can send RATE_LIMIT requests
// at 00:59 and another RATE_LIMIT at 01:00 (2× in 2 seconds). This is
// accepted as a known limitation to keep the implementation simple and the
// D1 write cost low (one upsert per request).
// This serves as a fallback when KV is not configured.
// ---------------------------------------------------------------------------

interface FixedWindowResult {
  allowed: boolean;
  count: number;
  windowEnd: number;
}

const fixedWindowRateLimit = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  apiKeyHash: string,
  now: number,
): Promise<FixedWindowResult> => {
  const db = c.get("db");

  const windowStart = now - (now % WINDOW_MS); // floor to minute boundary
  const windowEnd = windowStart + WINDOW_MS;

  // ---------------------------------------------------------------------------
  // Upsert: increment request_count for the current window.
  // D1 supports INSERT OR REPLACE / ON CONFLICT ... DO UPDATE.
  // We use raw sql here because Drizzle's onConflictDoUpdate works on the
  // unique index; we insert with a fresh nanoid id when it is a new row.
  // ---------------------------------------------------------------------------

  // First try to increment an existing row (most common path, avoids id generation).
  const updated = await db
    .update(rateLimits)
    .set({
      requestCount: sql`${rateLimits.requestCount} + 1`,
      updatedAt: now,
    })
    .where(and(eq(rateLimits.apiKeyHash, apiKeyHash), eq(rateLimits.windowStart, windowStart)))
    .returning({ requestCount: rateLimits.requestCount });

  let currentCount: number;

  if (updated.length > 0) {
    // Row already existed — use the returned count.
    currentCount = updated[0].requestCount;
  } else {
    // No row for this window yet — insert with count = 1.
    const inserted = await db
      .insert(rateLimits)
      .values({
        id: nanoid(),
        apiKeyHash,
        windowStart,
        requestCount: 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        // Race condition guard: another request may have inserted between
        // our UPDATE and this INSERT. Increment instead of failing.
        target: [rateLimits.apiKeyHash, rateLimits.windowStart],
        set: {
          requestCount: sql`${rateLimits.requestCount} + 1`,
          updatedAt: now,
        },
      })
      .returning({ requestCount: rateLimits.requestCount });

    currentCount = inserted[0]?.requestCount ?? 1;
  }

  return {
    allowed: currentCount <= RATE_LIMIT,
    count: currentCount,
    windowEnd,
  };
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const rateLimitMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = c.get("db");
  const apiKeyHash = c.get("apiKeyHash");

  const now = Date.now();
  // Feature flag: set USE_SLIDING_WINDOW environment variable to "true" to enable
  const useSlidingWindow = (c.env as { USE_SLIDING_WINDOW?: string }).USE_SLIDING_WINDOW === "true";

  let result: {
    allowed: boolean;
    count: number;
    retryAfter?: number;
    windowEnd?: number;
  };

  if (useSlidingWindow && c.env.RATE_LIMITS) {
    // Use sliding window with KV
    const kvResult = await slidingWindowRateLimit(c, apiKeyHash, now);
    if (kvResult) {
      result = {
        allowed: kvResult.allowed,
        count: kvResult.count,
        retryAfter: kvResult.retryAfter,
      };
    } else {
      // KV fallback — use fixed window
      const fixedResult = await fixedWindowRateLimit(c, apiKeyHash, now);
      result = {
        allowed: fixedResult.allowed,
        count: fixedResult.count,
        windowEnd: fixedResult.windowEnd,
      };
    }
  } else {
    // Use fixed window with D1
    const fixedResult = await fixedWindowRateLimit(c, apiKeyHash, now);
    result = {
      allowed: fixedResult.allowed,
      count: fixedResult.count,
      windowEnd: fixedResult.windowEnd,
    };
  }

  const { allowed, count, retryAfter, windowEnd } = result;
  const remaining = Math.max(0, RATE_LIMIT - count);

  // Calculate retry-after and reset time
  let retryAfterSeconds: number;
  let resetSeconds: number;

  if (retryAfter !== undefined) {
    // Sliding window provided exact retry-after
    retryAfterSeconds = retryAfter;
    resetSeconds = Math.ceil((now + retryAfter * 1000) / 1000);
  } else if (windowEnd !== undefined) {
    // Fixed window — retry at end of current window
    retryAfterSeconds = Math.ceil((windowEnd - now) / 1000);
    resetSeconds = Math.ceil(windowEnd / 1000);
  } else {
    // Fallback — default to window size
    retryAfterSeconds = Math.ceil(WINDOW_MS / 1000);
    resetSeconds = Math.ceil((now + WINDOW_MS) / 1000);
  }

  // Always attach rate limit headers on every response.
  c.header("X-RateLimit-Limit", String(RATE_LIMIT));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(resetSeconds)); // Unix seconds

  if (!allowed) {
    c.header("Retry-After", String(retryAfterSeconds));
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Maximum ${RATE_LIMIT} requests per minute. Retry after ${retryAfterSeconds} seconds.`,
        },
      },
      429,
    );
  }

  // Fire-and-forget cleanup of stale D1 rows (only for fixed window)
  if (!useSlidingWindow || !c.env.RATE_LIMITS) {
    const pruneOlderThan = now - PRUNE_OLDER_THAN_MS;
    c.executionCtx.waitUntil(
      db.delete(rateLimits).where(lt(rateLimits.windowStart, pruneOlderThan)),
    );
  }

  await next();
});
