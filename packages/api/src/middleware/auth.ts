import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { errorResponse } from "../lib/helpers";
import { effectiveKeyScopes, FULL_ACCESS } from "../lib/scopes";
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

/**
 * Parse a cached auth entry. Current entries are JSON `{ projectId, scopes }`.
 * Legacy entries are a bare projectId string and are treated as full access.
 * Exported so other auth middlewares (scoped-auth.ts) sharing the same
 * `auth:hash:${hash}` cache entries can decode them identically.
 */
export function parseCacheValue(raw: string): { projectId: string; scopes: string[] } {
  try {
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj === "object" &&
      typeof obj.projectId === "string" &&
      Array.isArray(obj.scopes)
    ) {
      // Honor the cached scope list exactly (an empty list grants nothing).
      return {
        projectId: obj.projectId,
        scopes: obj.scopes.filter((s: unknown): s is string => typeof s === "string"),
      };
    }
  } catch {
    // Not JSON — a legacy plain-string projectId entry (full access).
  }
  return { projectId: raw, scopes: [...FULL_ACCESS] };
}

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
      const cached = await c.env.AUTH_CACHE.get(cacheKey, "text");
      if (cached) {
        const { projectId, scopes } = parseCacheValue(cached);
        c.set("projectId", projectId);
        c.set("apiKeyHash", hash);
        c.set("authType", "api_key");
        c.set("capabilityScopes", scopes);

        // Skip the DB update for cache hits to avoid the query
        await next();
        return;
      }
    }

    // Cache miss or cache unavailable — query DB
    const [apiKey] = await db
      .select({
        id: apiKeys.id,
        projectId: apiKeys.projectId,
        revokedAt: apiKeys.revokedAt,
        scopes: apiKeys.scopes,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!key || !apiKey) {
      return authFailure(c, startedAt);
    }

    // Resolve effective scopes: explicit list, else full access (legacy keys).
    const scopes = effectiveKeyScopes(apiKey.scopes);

    // Populate KV cache for next request (5 minute TTL = 300 seconds). The value
    // carries projectId + scopes so the cache-hit path can authorize AND enforce
    // scopes without a DB check.
    // NOTE: the cache-hit path above authorizes WITHOUT a DB check, so a revoked
    // key would remain valid until its entry expires. Revoke paths
    // (routes/keys.ts, routes/projects.ts) delete the `auth:hash:${hash}` entry
    // on revoke to close that window.
    if (c.env.AUTH_CACHE) {
      const cacheKey = `auth:hash:${hash}`;
      const cacheValue = JSON.stringify({ projectId: apiKey.projectId, scopes });
      // Fire-and-forget cache write — don't block the request
      c.executionCtx.waitUntil(c.env.AUTH_CACHE.put(cacheKey, cacheValue, { expirationTtl: 300 }));
    }

    c.set("projectId", apiKey.projectId);
    c.set("apiKeyHash", hash);
    c.set("authType", "api_key");
    c.set("capabilityScopes", scopes);

    // Fire-and-forget last_used_at update — do not await to avoid blocking
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );

    await next();
  },
);
