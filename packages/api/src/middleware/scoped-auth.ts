import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys, capabilityTokens } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { errorResponse } from "../lib/helpers";
import { effectiveKeyScopes, parseScopesJson, scopeSatisfies } from "../lib/scopes";
import type { Bindings, Variables } from "../types";
import { parseCacheValue } from "./auth";

const AUTH_FAILURE_MIN_MS = 300;

export interface ScopedAuthOptions {
  scope: string;
  allowQueryToken?: boolean;
}

/**
 * Pad any credential-rejection branch (invalid/missing key, revoked, or
 * insufficient scope) to a constant minimum elapsed time so a caller cannot
 * use response speed to learn whether a credential is valid but underscoped
 * versus outright invalid. Any future middleware that rejects a *valid*
 * credential (expiry, revocation, scope) should route through this helper too.
 */
async function padAuthTiming(startedAt: number): Promise<void> {
  const remainingMs = Math.max(0, AUTH_FAILURE_MIN_MS - (performance.now() - startedAt));
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
}

async function authFailure(c: any, startedAt: number): Promise<Response> {
  await padAuthTiming(startedAt);
  return errorResponse(c, "UNAUTHORIZED", "Unauthorized", 401);
}

async function scopeDenied(c: any, startedAt: number, message: string): Promise<Response> {
  await padAuthTiming(startedAt);
  return errorResponse(c, "FORBIDDEN", message, 403);
}

export function scopedAuth(options: ScopedAuthOptions) {
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const startedAt = performance.now();
    const authHeader = c.req.header("Authorization");
    const queryToken = options.allowQueryToken ? c.req.query("token") : undefined;

    let key: string | undefined;
    if (authHeader?.startsWith("Bearer ")) {
      key = authHeader.slice(7).trim();
    } else if (queryToken?.startsWith("as_cap_")) {
      key = queryToken;
    }

    if (!key) return authFailure(c, startedAt);

    const hash = await hashApiKey(key);
    const db = c.get("db");

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

      const scopes = parseScopesJson(token.scopes);
      if (!scopeSatisfies(scopes, options.scope)) {
        return scopeDenied(c, startedAt, "Capability token does not have required scope");
      }

      c.set("projectId", token.projectId);
      c.set("apiKeyHash", hash);
      c.set("authType", "capability_token");
      c.set("capabilityScopes", scopes);
      c.executionCtx.waitUntil(
        db
          .update(capabilityTokens)
          .set({ lastUsedAt: now })
          .where(eq(capabilityTokens.id, token.id)),
      );
      await next();
      return;
    }

    if (queryToken) return authFailure(c, startedAt);

    // Try the shared KV auth cache first (same `auth:hash:${hash}` entries
    // apiKeyAuth reads/writes) so high-throughput state/lease/claim routes
    // don't pay a D1 read on every request. Capability tokens (above) are not
    // cached — they carry their own expiry/revocation semantics.
    const cacheKey = `auth:hash:${hash}`;
    if (c.env.AUTH_CACHE) {
      const cached = await c.env.AUTH_CACHE.get(cacheKey, "text");
      if (cached) {
        const { projectId, scopes } = parseCacheValue(cached);
        if (!scopeSatisfies(scopes, options.scope)) {
          return scopeDenied(c, startedAt, `Missing required scope: ${options.scope}`);
        }
        c.set("projectId", projectId);
        c.set("apiKeyHash", hash);
        c.set("authType", "api_key");
        c.set("capabilityScopes", scopes);
        // Skip the DB update for cache hits, matching apiKeyAuth's behavior.
        await next();
        return;
      }
    }

    const [apiKey] = await db
      .select({ id: apiKeys.id, projectId: apiKeys.projectId, scopes: apiKeys.scopes })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!apiKey) return authFailure(c, startedAt);

    // Regular API keys are scope-checked too: legacy/unscoped keys resolve to the
    // `*` wildcard and satisfy every scope, preserving backward compatibility.
    const scopes = effectiveKeyScopes(apiKey.scopes);
    if (!scopeSatisfies(scopes, options.scope)) {
      return scopeDenied(c, startedAt, `Missing required scope: ${options.scope}`);
    }

    c.set("projectId", apiKey.projectId);
    c.set("apiKeyHash", hash);
    c.set("authType", "api_key");
    c.set("capabilityScopes", scopes);
    if (c.env.AUTH_CACHE) {
      const cacheValue = JSON.stringify({ projectId: apiKey.projectId, scopes });
      c.executionCtx.waitUntil(c.env.AUTH_CACHE.put(cacheKey, cacheValue, { expirationTtl: 300 }));
    }
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );
    await next();
  });
}
