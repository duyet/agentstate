import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys, capabilityTokens } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { errorResponse } from "../lib/helpers";
import type { Bindings, Variables } from "../types";

const AUTH_FAILURE_MIN_MS = 300;

export interface ScopedAuthOptions {
  scope: string;
  allowQueryToken?: boolean;
}

async function authFailure(c: any, startedAt: number): Promise<Response> {
  const remainingMs = Math.max(0, AUTH_FAILURE_MIN_MS - (performance.now() - startedAt));
  await new Promise((resolve) => setTimeout(resolve, remainingMs));
  return errorResponse(c, "UNAUTHORIZED", "Unauthorized", 401);
}

function parseScopes(value: string): string[] {
  try {
    const scopes = JSON.parse(value);
    return Array.isArray(scopes) ? scopes.filter((scope) => typeof scope === "string") : [];
  } catch {
    return [];
  }
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

      const scopes = parseScopes(token.scopes);
      if (!scopes.includes(options.scope)) {
        return errorResponse(c, "FORBIDDEN", "Capability token does not have required scope", 403);
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

    const [apiKey] = await db
      .select({ id: apiKeys.id, projectId: apiKeys.projectId })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!apiKey) return authFailure(c, startedAt);

    c.set("projectId", apiKey.projectId);
    c.set("apiKeyHash", hash);
    c.set("authType", "api_key");
    c.set("capabilityScopes", []);
    c.executionCtx.waitUntil(
      db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, apiKey.id)),
    );
    await next();
  });
}
