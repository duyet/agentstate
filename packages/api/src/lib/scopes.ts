import { z } from "zod";

// ---------------------------------------------------------------------------
// API key / OAuth permission scopes
// ---------------------------------------------------------------------------
//
// Canonical resource:action permission set shared by API keys and OAuth-issued
// access tokens. Regular `as_live_` keys created before scopes existed (and any
// key created without an explicit scope list) are treated as full access via the
// `*` wildcard, so enforcement is backward-compatible.
//
// The existing capability-token scopes (state:*, lease:write, claim:write) are a
// subset of this set, so capability tokens keep working unchanged.

/** Concrete, grantable scopes. */
export const API_SCOPES = [
  "conversations:read",
  "conversations:write",
  "state:read",
  "state:write",
  "state:watch",
  "lease:write",
  "claim:read",
  "claim:write",
  "analytics:read",
  "webhooks:write",
  "domains:write",
  "keys:read",
  "keys:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Wildcard granting every scope. */
export const WILDCARD_SCOPE = "*";

/** Full-access scope set applied to legacy / unscoped keys. */
export const FULL_ACCESS: readonly string[] = [WILDCARD_SCOPE];

/** Distinct resource prefixes (e.g. "state", "conversations") for resource wildcards. */
const RESOURCES = Array.from(new Set(API_SCOPES.map((s) => s.split(":")[0])));

const RESOURCE_WILDCARD = /^([a-z]+):\*$/;

/**
 * Is `scope` something a user may grant? Accepts a concrete scope, the global
 * wildcard `*`, or a per-resource wildcard like `state:*`.
 */
export function isGrantableScope(scope: string): boolean {
  if (scope === WILDCARD_SCOPE) return true;
  if ((API_SCOPES as readonly string[]).includes(scope)) return true;
  const match = RESOURCE_WILDCARD.exec(scope);
  return match !== null && RESOURCES.includes(match[1]);
}

/** Zod schema for a single grantable scope string. */
export const GrantableScopeSchema = z.string().refine(isGrantableScope, {
  message: `invalid scope; allowed: "${WILDCARD_SCOPE}", ${API_SCOPES.join(", ")}, or <resource>:*`,
});

/**
 * Does the granted scope set satisfy a single required scope?
 * Honors the global `*` wildcard and per-resource `resource:*` wildcards.
 */
export function scopeSatisfies(granted: readonly string[], required: string): boolean {
  if (granted.includes(WILDCARD_SCOPE)) return true;
  if (granted.includes(required)) return true;
  const resource = required.split(":")[0];
  return granted.includes(`${resource}:*`);
}

/**
 * Are ALL required scopes satisfied by the granted set? Used for delegation:
 * a key may only mint a child key whose scopes are a subset of its own.
 */
export function scopesSatisfyAll(granted: readonly string[], required: readonly string[]): boolean {
  return required.every((scope) => scopeSatisfies(granted, scope));
}

/**
 * Parse a JSON-encoded scopes column into a string array.
 * Returns [] for null/invalid input (callers treat [] as full access).
 */
export function parseScopesJson(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Resolve the effective scope set for an API key row. A null/absent column means
 * a legacy or unscoped key → full access. An explicit list is honored as-is
 * (an explicit empty list grants nothing — it never silently becomes full access).
 */
export function effectiveKeyScopes(scopesColumn: string | null | undefined): string[] {
  if (scopesColumn == null) return [...FULL_ACCESS];
  return parseScopesJson(scopesColumn);
}
