// ---------------------------------------------------------------------------
// Project Creation Rate Limiting Middleware
// ---------------------------------------------------------------------------
// Project creation is a sensitive operation that can impact system resources.
// We apply a stricter rate limit than the default API rate limit to prevent
// abuse through unlimited project creation (DoS prevention).
//
// Limit: 5 projects per minute per identifier (vs. 100 requests/minute default)
// Window: 60 seconds (fixed window for simplicity)
//
// Rate limit identifier (in order of preference):
// 1. API key hash (for authenticated API requests)
// 2. Client IP address (for dashboard requests without API key)
// ---------------------------------------------------------------------------

import { createMiddleware } from "hono/factory";
import {
  checkProjectCreationRateLimit,
  hashIdentifier,
  pruneOldRateLimits,
} from "../services/projects";
import type { Bindings, Variables } from "../types";

/**
 * Project creation rate limiter using a fixed-window counter.
 * This runs independently of the general rateLimitMiddleware.
 */
export const projectCreationRateLimit = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = c.get("db");

  // Determine the rate limit identifier
  // Priority: API key hash > Client IP address
  let identifier: string;
  const apiKeyHash = c.get("apiKeyHash");

  if (apiKeyHash) {
    identifier = `key:${apiKeyHash}`;
  } else {
    // Fallback to IP address for dashboard requests
    // Get IP from CF-Connecting-IP header (set by Cloudflare)
    const ip = c.req.header("CF-Connecting-IP") || "unknown";
    identifier = `ip:${await hashIdentifier(ip)}`;
  }

  const result = await checkProjectCreationRateLimit(db, identifier);

  // Attach project-creation-specific rate limit headers
  c.header("X-RateLimit-Limit-ProjectCreation", String(5));
  c.header("X-RateLimit-Remaining-ProjectCreation", String(result.remaining));

  if (!result.allowed) {
    c.header("Retry-After", String(result.retryAfter));
    c.header("X-RateLimit-Reset-ProjectCreation", String(result.resetAt));

    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Project creation rate limit exceeded. Maximum 5 projects per minute. Retry after ${result.retryAfter} seconds.`,
        },
      },
      429,
    );
  }

  // Fire-and-forget cleanup of old project creation rate limit rows
  c.executionCtx.waitUntil(pruneOldRateLimits(db, Date.now()));

  await next();
});
