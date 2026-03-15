import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import type { Bindings, Variables } from "../types";

export const apiKeyAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }, 401);
    }

    const key = authHeader.slice(7).trim();

    if (!key) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }, 401);
    }

    const hash = await hashApiKey(key);
    const db = c.get("db");

    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!apiKey) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }, 401);
    }

    c.set("projectId", apiKey.projectId);

    // Fire-and-forget last_used_at update — do not await to avoid blocking
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );

    await next();
  },
);
