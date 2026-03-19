import { Hono } from "hono";
import { notFound, parseJsonBody, validationError } from "../../../lib/helpers";
import { CreateApiKeySchema } from "../../../lib/validation";
import { apiKeyAuth } from "../../../middleware/auth";
import { rateLimitMiddleware } from "../../../middleware/rate-limit";
import * as keysService from "../../../services/keys";
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

  const db = c.get("db");
  const projectId = c.get("projectId");

  const apiKey = await keysService.createApiKey(db, projectId, parsed.data.name);

  return c.json(
    {
      key_id: apiKey.id,
      project_id: projectId,
      name: apiKey.name,
      key_prefix: apiKey.key_prefix,
      key: apiKey.key,
      created_at: apiKey.created_at,
      last_used_at: apiKey.last_used_at,
      revoked_at: apiKey.revoked_at,
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

  const keys = await keysService.listApiKeys(db, projectId);

  return c.json({
    data: keys.map((k) => ({
      key_id: k.id,
      project_id: k.project_id,
      name: k.name,
      key_prefix: k.key_prefix,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
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

  const revoked = await keysService.revokeApiKey(db, projectId, keyId);

  if (!revoked) {
    return notFound(c, "API key not found");
  }

  return c.body(null, 204);
});

export default router;
