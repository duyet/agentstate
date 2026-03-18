import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { deprecationMiddleware } from "../lib/deprecation";
import { parseJsonBody, requireSameProject, validationError } from "../lib/helpers";
import { generateApiKey, generateId } from "../lib/id";
import { CreateApiKeySchema } from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All key management routes require authentication.
// The caller must use a valid API key for the target project.
app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// V1 deprecation notice
app.use(
  "*",
  deprecationMiddleware({
    message: "API v1 is deprecated. Use /api/v2/keys instead.",
    sunsetDate: "2026-12-31",
    link: "https://docs.agentstate.app/api/v2/migration",
  }),
);

// POST /:projectId/keys — Create API key
app.post("/:projectId/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");

  const unauthorized = requireSameProject(c, projectId);
  if (unauthorized) return unauthorized;

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
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

  const unauthorized = requireSameProject(c, projectId);
  if (unauthorized) return unauthorized;

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

  const unauthorized = requireSameProject(c, projectId);
  if (unauthorized) return unauthorized;

  // Scope WHERE to both keyId AND projectId for defense-in-depth
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default app;
