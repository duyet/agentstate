import { and, eq, lt, sql } from "drizzle-orm";
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
// Sliding-window rate limiter (D1 / SQLite)
//
// Algorithm: fixed-window counter keyed by (api_key_hash, window_start).
// window_start is floored to the current 60-second boundary so that every
// key gets exactly RATE_LIMIT requests per UTC minute.
//
// Trade-off vs. a true sliding window: a caller can send RATE_LIMIT requests
// at 00:59 and another RATE_LIMIT at 01:00 (2× in 2 seconds). This is
// accepted as a known limitation to keep the implementation simple and the
// D1 write cost low (one upsert per request).
// ---------------------------------------------------------------------------

export const rateLimitMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = c.get("db");
  const apiKeyHash = c.get("apiKeyHash");

  const now = Date.now();
  const windowStart = now - (now % WINDOW_MS); // floor to minute boundary
  const windowEnd = windowStart + WINDOW_MS; // when the current window resets
  const retryAfterSeconds = Math.ceil((windowEnd - now) / 1000);

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

  const remaining = Math.max(0, RATE_LIMIT - currentCount);

  // Always attach rate limit headers on every response.
  c.header("X-RateLimit-Limit", String(RATE_LIMIT));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(windowEnd / 1000))); // Unix seconds

  if (currentCount > RATE_LIMIT) {
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

  // Fire-and-forget cleanup of stale rows (rows older than 2 windows).
  // Using waitUntil so cleanup does not add latency to the current request.
  const pruneOlderThan = now - PRUNE_OLDER_THAN_MS;
  c.executionCtx.waitUntil(db.delete(rateLimits).where(lt(rateLimits.windowStart, pruneOlderThan)));

  await next();
});
