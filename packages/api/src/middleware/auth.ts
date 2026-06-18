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
const AUTH_FAILURE_MIN_MS = 300;
const DUMMY_API_KEY = "as_live_0000000000000000000000000000000000000000";

const authFailure = async (c: any, startedAt: number): Promise<Response> => {
  // Wait until a minimum total failure time so hash/DB variance is not exposed.
  const remainingMs = Math.max(0, AUTH_FAILURE_MIN_MS - (performance.now() - startedAt));
  await new Promise((resolve) => setTimeout(resolve, remainingMs));
  return errorResponse(c, "UNAUTHORIZED", "Unauthorized", 401);
};

export const apiKeyAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const startedAt = performance.now();
    const authHeader = c.req.header("Authorization");
    const hasBearer = authHeader?.startsWith("Bearer ") ?? false;
    const key = hasBearer ? (authHeader ?? "").slice(7).trim() : "";
    const lookupKey = key.startsWith("as_live_") ? key : DUMMY_API_KEY;

    const hash = await hashApiKey(lookupKey);
    const db = c.get("db");

    // Try KV cache first if available
    if (key && c.env.AUTH_CACHE) {
      const cacheKey = `auth:hash:${hash}`;
      const cachedProjectId = await c.env.AUTH_CACHE.get(cacheKey, "text");
      if (cachedProjectId) {
        c.set("projectId", cachedProjectId);
        c.set("apiKeyHash", hash);
        c.set("authType", "api_key");
        c.set("capabilityScopes", []);

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

    if (!key || !apiKey) {
      return authFailure(c, startedAt);
    }

    // Populate KV cache for next request (5 minute TTL = 300 seconds).
    // NOTE: the cache-hit path above authorizes WITHOUT a DB check, so a
    // revoked key would remain valid until its entry expires. Revoke paths
    // (routes/keys.ts, routes/projects.ts) therefore
    // delete the `auth:hash:${hash}` entry on revoke to close that window.
    if (c.env.AUTH_CACHE) {
      const cacheKey = `auth:hash:${hash}`;
      // Fire-and-forget cache write — don't block the request
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, apiKey.projectId, { expirationTtl: 300 }),
      );
    }

    c.set("projectId", apiKey.projectId);
    c.set("apiKeyHash", hash);
    c.set("authType", "api_key");
    c.set("capabilityScopes", []);

    // Fire-and-forget last_used_at update — do not await to avoid blocking
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );

    await next();
  },
);
