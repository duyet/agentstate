import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiKeys, projects } from "../../../db/schema";
import { hashApiKey } from "../../../lib/crypto";
import { notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { generateApiKey, generateId } from "../../../lib/id";
import { CreateApiKeySchema } from "../../../lib/validation";
import type { Bindings, Variables } from "../../../types";
import crudRouter from "./crud";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Mount CRUD router
router.route("/", crudRouter);

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

/**
 * Build a new API key record and return both the raw key and insert values.
 */
async function buildApiKey(projectId: string, name: string) {
  const rawKey = generateApiKey();
  const hash = await hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 12);
  const id = generateId();
  const now = Date.now();

  return {
    id,
    rawKey,
    values: {
      id,
      projectId,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      createdAt: now,
    },
    prefix,
    now,
  };
}

// ---------------------------------------------------------------------------
// POST /:id/keys — Generate new API key
// ---------------------------------------------------------------------------

router.post("/:id/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  // Verify the project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project) {
    return notFound(c, "Project not found");
  }

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(c, parsed.error);
  }

  const key = await buildApiKey(projectId, parsed.data.name);
  await db.insert(apiKeys).values(key.values);

  return c.json(
    {
      id: key.id,
      name: parsed.data.name,
      key_prefix: key.prefix,
      key: key.rawKey,
      created_at: key.now,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// DELETE /:id/keys/:keyId — Revoke API key
// ---------------------------------------------------------------------------

router.delete("/:id/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");
  const keyId = c.req.param("keyId");

  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));

  return c.body(null, 204);
});

export default router;
