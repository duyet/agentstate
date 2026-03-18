import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import type { Bindings, Variables } from "../types";

export const apiKeyAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
    }

    const key = authHeader.slice(7).trim();

    if (!key) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
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
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!apiKey) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
    }

    // Populate KV cache for next request (5 minute TTL = 300 seconds)
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
