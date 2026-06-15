import { Hono } from "hono";
import {
  invalidateAuthCacheEntries,
  notFound,
  parseJsonBody,
  requireSameProject,
  validationError,
} from "../lib/helpers";
import { CreateApiKeySchema } from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import * as keysService from "../services/keys";
import type { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All key management routes require authentication.
// The caller must use a valid API key for the target project.
app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// ---------------------------------------------------------------------------
// POST /:projectId/keys — Create API key
// ---------------------------------------------------------------------------

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

  const apiKey = await keysService.createApiKey(db, projectId, parsed.data.name);

  return c.json(
    {
      id: apiKey.id,
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
// GET /:projectId/keys — List API keys
// ---------------------------------------------------------------------------

app.get("/:projectId/keys", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");

  const unauthorized = requireSameProject(c, projectId);
  if (unauthorized) return unauthorized;

  const keys = await keysService.listApiKeys(db, projectId);

  return c.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
    })),
  });
});

// ---------------------------------------------------------------------------
// DELETE /:projectId/keys/:keyId — Revoke API key
// ---------------------------------------------------------------------------

app.delete("/:projectId/keys/:keyId", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("projectId");
  const keyId = c.req.param("keyId");

  const unauthorized = requireSameProject(c, projectId);
  if (unauthorized) return unauthorized;

  const revokedHash = await keysService.revokeApiKey(db, projectId, keyId);

  if (!revokedHash) {
    return notFound(c, "API key not found");
  }

  // Invalidate the auth-cache entry so the revoked key stops working
  // immediately (the cache-hit path authorizes without a DB check).
  invalidateAuthCacheEntries(c, [revokedHash]);

  return c.body(null, 204);
});

export default app;
