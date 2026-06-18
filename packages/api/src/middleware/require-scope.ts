import { createMiddleware } from "hono/factory";
import { errorResponse } from "../lib/helpers";
import { scopeSatisfies } from "../lib/scopes";
import type { Bindings, Variables } from "../types";

/**
 * Enforce that the authenticated credential (API key or capability/OAuth token)
 * holds the required scope. Must run AFTER an auth middleware that sets
 * `capabilityScopes` on the context (apiKeyAuth / scopedAuth).
 *
 * Legacy / unscoped keys resolve to the `*` wildcard upstream, so they satisfy
 * every scope and remain backward-compatible.
 */
export function requireScope(scope: string) {
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const granted = c.get("capabilityScopes") ?? [];
    if (!scopeSatisfies(granted, scope)) {
      return errorResponse(c, "FORBIDDEN", `Missing required scope: ${scope}`, 403);
    }
    await next();
  });
}
