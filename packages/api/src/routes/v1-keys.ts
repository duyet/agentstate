import { Hono } from "hono";
import {
  errorResponse,
  invalidateAuthCacheEntries,
  notFound,
  parseJsonBody,
  validationError,
} from "../lib/helpers";
import { scopesSatisfyAll } from "../lib/scopes";
import { CreateApiKeySchema } from "../lib/validation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { requireScope } from "../middleware/require-scope";
import * as keysService from "../services/keys";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Keyless API-key management — manage keys for the authenticated project using
// only an API key (no projectId in the path, no Clerk session). Used by
// non-dashboard clients (SDK, stdio MCP). The dashboard keeps using the
// projectId-scoped routes in routes/keys.ts. Project is always derived from the
// auth context, so a caller can never manage another project's keys.
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// POST / — Create API key
app.post("/", requireScope("keys:write"), async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const { body, error } = await parseJsonBody(c);
  if (error) return error;

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);

  // Delegation rule (identical to routes/keys.ts): a key may only mint a child
  // whose scopes are a subset of its own. Omitted scopes inherit the caller's
  // scopes; a full-access (`*`) caller leaves scopes unset for a full child.
  const callerScopes = c.get("capabilityScopes") ?? [];
  const callerHasFullAccess = callerScopes.includes("*");
  let childScopes = parsed.data.scopes;
  // Explicit checks against undefined (not a truthy check): an explicit `[]`
  // must still be validated here rather than falling through to the
  // "omitted" inheritance branch below.
  if (childScopes !== undefined) {
    if (!scopesSatisfyAll(callerScopes, childScopes)) {
      return errorResponse(
        c,
        "FORBIDDEN",
        "Cannot grant scopes beyond the calling key's own scopes",
        403,
      );
    }
  } else if (!callerHasFullAccess) {
    childScopes = callerScopes;
  }

  const apiKey = await keysService.createApiKey(db, projectId, parsed.data.name, childScopes);

  return c.json(
    {
      id: apiKey.id,
      name: apiKey.name,
      key_prefix: apiKey.key_prefix,
      key: apiKey.key,
      scopes: apiKey.scopes,
      created_at: apiKey.created_at,
      last_used_at: apiKey.last_used_at,
      revoked_at: apiKey.revoked_at,
    },
    201,
  );
});

// GET / — List API keys
app.get("/", requireScope("keys:read"), async (c) => {
  const db = c.get("db");
  const keys = await keysService.listApiKeys(db, c.get("projectId"));

  return c.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      scopes: k.scopes,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      revoked_at: k.revoked_at,
    })),
  });
});

// DELETE /:id — Revoke API key
app.delete("/:id", requireScope("keys:write"), async (c) => {
  const db = c.get("db");
  const keyId = c.req.param("id");

  const revokedHash = await keysService.revokeApiKey(db, c.get("projectId"), keyId);
  if (!revokedHash) return notFound(c, "API key not found");

  // Invalidate the auth-cache entry so the revoked key stops working immediately.
  invalidateAuthCacheEntries(c, [revokedHash]);

  return c.body(null, 204);
});

export default app;
