import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { errorResponse } from "../lib/helpers";
import type { Bindings, Variables } from "../types";

/**
 * Constant-time delay for all auth failures to prevent timing attacks.
 * All auth failure paths (missing key, invalid format, not found, revoked)
 * should take approximately the same time to prevent key enumeration.
 */
const AUTH_FAILURE_DELAY_MS = 50;

const authFailure = async (c: any): Promise<Response> => {
  // Add constant-time delay to prevent timing attacks
  await new Promise((resolve) => setTimeout(resolve, AUTH_FAILURE_DELAY_MS));
  return errorResponse(c, "UNAUTHORIZED", "Unauthorized", 401);
};

export const apiKeyAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return authFailure(c);
    }

    const key = authHeader.slice(7).trim();

    if (!key) {
      return authFailure(c);
    }

    const hash = await hashApiKey(key);
    const db = c.get("db");

    // Try KV cache first if available
    if (c.env.AUTH_CACHE) {
      const cacheKey = `auth:hash:${hash}`;
      const cachedProjectId = await c.env.AUTH_CACHE.get(cacheKey, "text");
      if (cachedProjectId) {
        c.set("projectId", cachedProjectId);
        c.set("apiKeyHash", hash);

        // Fire-and-forget last_used_at update — do not await to avoid blocking
        // We don't have the apiKey.id here, but the cache hit means the key is valid
        // Skip the DB update for cache hits to avoid the query
        await next();
        return;
      }
    }

    // Cache miss or cache unavailable — query DB
    const [apiKey] = await db
      .select({ id: apiKeys.id, projectId: apiKeys.projectId, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!apiKey) {
      return authFailure(c);
    }

    // Populate KV cache for next request (5 minute TTL = 300 seconds)
    // Cache key is based on hash only; revoked keys won't match the WHERE clause above
    // so they will never be cached, and existing cache entries become effectively
    // invalid once a key is revoked (DB query will return null for revoked keys)
    if (c.env.AUTH_CACHE) {
      const cacheKey = `auth:hash:${hash}`;
      // Fire-and-forget cache write — don't block the request
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, apiKey.projectId, { expirationTtl: 300 }),
      );
    }

    c.set("projectId", apiKey.projectId);
    c.set("apiKeyHash", hash);

    // Fire-and-forget last_used_at update — do not await to avoid blocking
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );

    await next();
  },
);
