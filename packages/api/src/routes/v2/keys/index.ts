import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiKeys } from "../../../db/schema";
import { hashApiKey } from "../../../lib/crypto";
import { notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { generateApiKey, generateId } from "../../../lib/id";
import { CreateApiKeySchema } from "../../../lib/validation";
import { apiKeyAuth } from "../../../middleware/auth";
import { rateLimitMiddleware } from "../../../middleware/rate-limit";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth and rate-limit middleware once for all key routes
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// ---------------------------------------------------------------------------
// POST / — Create API key
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
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
  const projectId = c.get("projectId");

  await c.get("db").insert(apiKeys).values({
    id,
    projectId,
    name: parsed.data.name,
    keyPrefix: prefix,
    keyHash: hash,
    createdAt: now,
  });

  return c.json(
    {
      key_id: id,
      project_id: projectId,
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

// ---------------------------------------------------------------------------
// GET / — List API keys
// ---------------------------------------------------------------------------

router.get("/", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const keys = await db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId));

  return c.json({
    data: keys.map((k) => ({
      key_id: k.id,
      project_id: k.projectId,
      name: k.name,
      key_prefix: k.keyPrefix,
      created_at: k.createdAt,
      last_used_at: k.lastUsedAt,
      revoked_at: k.revokedAt,
    })),
  });
});

// ---------------------------------------------------------------------------
// DELETE /:id — Revoke API key
// ---------------------------------------------------------------------------

router.delete("/:id", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const keyId = c.req.param("id");

  // Verify the key exists and belongs to the project
  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
    .limit(1);

  if (!existing) {
    return notFound(c, "API key not found");
  }

  // Soft delete by setting revokedAt
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default router;
