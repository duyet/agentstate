import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { generateApiKey, generateId } from "../lib/id";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All key management routes require authentication.
// The caller must use a valid API key for the target project.
app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// POST /:projectId/keys — Create API key
app.post("/:projectId/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const authedProjectId = c.get("projectId");

  // Only allow creating keys for the project the caller is authenticated against
  if (projectId !== authedProjectId) {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Cannot manage keys for another project" } },
      403,
    );
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400);
  }

  const parsed = z.object({ name: z.string().min(1, "name is required").max(255) }).safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.errors[0]?.message ?? "Validation error",
        },
      },
      400,
    );
  }

  const rawKey = generateApiKey();
  const hash = await hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 12);
  const id = generateId();
  const now = Date.now();

  await db.insert(apiKeys).values({
    id,
    projectId,
    name: parsed.data.name,
    keyPrefix: prefix,
    keyHash: hash,
    createdAt: now,
  });

  return c.json(
    {
      id,
      name: parsed.data.name,
      key_prefix: prefix,
      key: rawKey,
      created_at: now,
      last_used_at: null,
      revoked_at: null,
    },
    201,
  );
});

// GET /:projectId/keys — List API keys
app.get("/:projectId/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const authedProjectId = c.get("projectId");

  if (projectId !== authedProjectId) {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Cannot manage keys for another project" } },
      403,
    );
  }

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId));

  return c.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.keyPrefix,
      created_at: k.createdAt,
      last_used_at: k.lastUsedAt,
      revoked_at: k.revokedAt,
    })),
  });
});

// DELETE /:projectId/keys/:keyId — Revoke API key
app.delete("/:projectId/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const keyId = c.req.param("keyId");
  const authedProjectId = c.get("projectId");

  if (projectId !== authedProjectId) {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Cannot manage keys for another project" } },
      403,
    );
  }

  // Scope WHERE to both keyId AND projectId for defense-in-depth
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default app;
