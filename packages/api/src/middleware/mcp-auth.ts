import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys, capabilityTokens } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { effectiveKeyScopes, parseScopesJson } from "../lib/scopes";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// MCP auth — accepts either an `as_live_` API key or an `as_cap_` capability
// token (the OAuth-issued access tokens reuse the capability-token table). Sets
// the same context vars as the other auth middlewares so the MCP tool handlers
// can call services directly with `c.get("projectId")` and enforce per-tool
// scopes via `c.get("capabilityScopes")`.
//
// On any auth failure the MCP spec requires a 401 carrying a WWW-Authenticate
// header that points clients at the protected-resource metadata document, so
// they can discover the authorization server and start the OAuth flow.
// ---------------------------------------------------------------------------

/** Constant-time failure delay, matching auth.ts / scoped-auth.ts. */
const AUTH_FAILURE_MIN_MS = 300;

/** Build the resource-metadata URL for the WWW-Authenticate challenge. */
function resourceMetadataUrl(reqUrl: string): string {
  const origin = new URL(reqUrl).origin;
  return `${origin}/.well-known/oauth-protected-resource`;
}

async function authFailure(c: any, startedAt: number): Promise<Response> {
  const remainingMs = Math.max(0, AUTH_FAILURE_MIN_MS - (performance.now() - startedAt));
  await new Promise((resolve) => setTimeout(resolve, remainingMs));
  c.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl(c.req.url)}"`);
  return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
}

export const mcpAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const startedAt = performance.now();
    const authHeader = c.req.header("Authorization");
    const key = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!key) return authFailure(c, startedAt);

    const hash = await hashApiKey(key);
    const db = c.get("db");

    // Capability / OAuth access token.
    if (key.startsWith("as_cap_")) {
      const now = Date.now();
      const [token] = await db
        .select({
          id: capabilityTokens.id,
          projectId: capabilityTokens.projectId,
          scopes: capabilityTokens.scopes,
        })
        .from(capabilityTokens)
        .where(
          and(
            eq(capabilityTokens.keyHash, hash),
            isNull(capabilityTokens.revokedAt),
            or(isNull(capabilityTokens.expiresAt), gt(capabilityTokens.expiresAt, now)),
          ),
        )
        .limit(1);

      if (!token) return authFailure(c, startedAt);

      c.set("projectId", token.projectId);
      c.set("apiKeyHash", hash);
      c.set("authType", "capability_token");
      c.set("capabilityScopes", parseScopesJson(token.scopes));
      c.executionCtx.waitUntil(
        db
          .update(capabilityTokens)
          .set({ lastUsedAt: now })
          .where(eq(capabilityTokens.id, token.id)),
      );
      await next();
      return;
    }

    // Regular API key.
    if (key.startsWith("as_live_")) {
      const [apiKey] = await db
        .select({ id: apiKeys.id, projectId: apiKeys.projectId, scopes: apiKeys.scopes })
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
        .limit(1);

      if (!apiKey) return authFailure(c, startedAt);

      c.set("projectId", apiKey.projectId);
      c.set("apiKeyHash", hash);
      c.set("authType", "api_key");
      c.set("capabilityScopes", effectiveKeyScopes(apiKey.scopes));
      c.executionCtx.waitUntil(
        db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
      );
      await next();
      return;
    }

    return authFailure(c, startedAt);
  },
);
