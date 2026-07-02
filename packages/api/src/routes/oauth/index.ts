import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { organizations, projects } from "../../db/schema";
import { type AppContext, errorResponse } from "../../lib/helpers";
import { isGrantableScope, WILDCARD_SCOPE } from "../../lib/scopes";
import { clerkDashboardAuth } from "../../middleware/clerk-dashboard-auth";
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  getClient,
  isAllowedRedirectUri,
  OAuthError,
  parseRedirectUris,
  refreshAccessToken,
  registerClient,
} from "../../services/oauth";
import type { Bindings, Variables } from "../../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Origin (scheme + host) of the incoming request — the OAuth issuer. */
function requestOrigin(c: AppContext): string {
  return new URL(c.req.url).origin;
}

// Deviation from the project-wide error format (`{ error: { code, message } }`,
// see lib/helpers.ts#errorResponse): the /token endpoint below is consumed by
// generic OAuth 2.1 clients (e.g. MCP clients doing the authorization_code /
// refresh_token grants), which expect the RFC 6749 §5.2 shape
// `{ error, error_description }` with `error` as a short machine string
// ("invalid_request", "invalid_grant", etc.), not the API's nested object.
// Every other route in this file (register/authorize/authorize-decision) is
// AgentState-specific tooling, not a generic OAuth client surface, so those
// keep using the standard `errorResponse` format.
/** RFC 6749 OAuth error JSON for the token endpoint. */
function oauthError(c: AppContext, error: string, description: string, status: 400 | 401 = 400) {
  return c.json({ error, error_description: description }, status);
}

/**
 * Parse a token-endpoint body that may be form-encoded or JSON.
 * Returns a flat record of string values.
 */
async function parseTokenBody(c: AppContext): Promise<Record<string, string>> {
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await c.req.json().catch(() => ({}));
    const out: Record<string, string> = {};
    if (json && typeof json === "object") {
      for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
    }
    return out;
  }
  // Default: form-encoded (the OAuth-standard content type).
  const form = await c.req.parseBody().catch(() => ({}));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// POST /api/oauth/register — Dynamic Client Registration (RFC 7591, public)
// ---------------------------------------------------------------------------

app.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(c, "BAD_REQUEST", "Invalid JSON body", 400);
  }

  const clientName = (body as Record<string, unknown>).client_name;
  const redirectUris = (body as Record<string, unknown>).redirect_uris;
  const grantTypes = (body as Record<string, unknown>).grant_types;
  const authMethod = (body as Record<string, unknown>).token_endpoint_auth_method;

  if (typeof clientName !== "string" || clientName.length === 0) {
    return errorResponse(c, "BAD_REQUEST", "client_name is required", 400);
  }
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every((u): u is string => typeof u === "string")
  ) {
    return errorResponse(c, "BAD_REQUEST", "redirect_uris must be a non-empty string array", 400);
  }
  for (const uri of redirectUris) {
    if (!isAllowedRedirectUri(uri)) {
      return errorResponse(
        c,
        "BAD_REQUEST",
        `redirect_uri must be https or localhost: ${uri}`,
        400,
      );
    }
  }
  if (grantTypes !== undefined && !Array.isArray(grantTypes)) {
    return errorResponse(c, "BAD_REQUEST", "grant_types must be an array", 400);
  }
  if (authMethod !== undefined && typeof authMethod !== "string") {
    return errorResponse(c, "BAD_REQUEST", "token_endpoint_auth_method must be a string", 400);
  }

  const db = c.get("db");
  const registered = await registerClient(db, {
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: grantTypes as string[] | undefined,
    token_endpoint_auth_method: authMethod as string | undefined,
  });

  return c.json(registered, 201);
});

// ---------------------------------------------------------------------------
// GET /api/oauth/authorize — Authorization endpoint (public)
//
// Validates the request, then redirects the browser to the dashboard consent
// page. Invalid client/redirect → 400 (never redirect, to avoid open redirect).
// ---------------------------------------------------------------------------

app.get("/authorize", async (c) => {
  const responseType = c.req.query("response_type");
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const codeChallenge = c.req.query("code_challenge");
  const codeChallengeMethod = c.req.query("code_challenge_method");

  if (!clientId) {
    return errorResponse(c, "INVALID_REQUEST", "client_id is required", 400);
  }
  if (!redirectUri) {
    return errorResponse(c, "INVALID_REQUEST", "redirect_uri is required", 400);
  }

  const db = c.get("db");
  const client = await getClient(db, clientId);
  if (!client) {
    return errorResponse(c, "INVALID_CLIENT", "Unknown client_id", 400);
  }

  // Exact-match redirect_uri against the client's registered URIs.
  const registered = parseRedirectUris(client.redirectUris);
  if (!registered.includes(redirectUri)) {
    return errorResponse(c, "INVALID_REQUEST", "redirect_uri does not match", 400);
  }

  // From here, the request is bound to a known client + valid redirect.
  // Remaining validation errors are still returned as 400 (not redirected to
  // the client) because the consent flow has not yet been authorized by a user.
  if (responseType !== "code") {
    return errorResponse(c, "UNSUPPORTED_RESPONSE_TYPE", "response_type must be 'code'", 400);
  }
  if (!codeChallenge) {
    return errorResponse(c, "INVALID_REQUEST", "code_challenge is required (PKCE)", 400);
  }
  if (codeChallengeMethod !== "S256") {
    return errorResponse(c, "INVALID_REQUEST", "code_challenge_method must be 'S256'", 400);
  }

  // Forward every original query param to the dashboard consent page, which
  // handles login and approval, then calls /authorize/decision.
  const consentUrl = new URL("/oauth/consent", requestOrigin(c));
  const incoming = new URL(c.req.url);
  for (const [key, value] of incoming.searchParams) {
    consentUrl.searchParams.set(key, value);
  }
  return c.redirect(consentUrl.toString(), 302);
});

// ---------------------------------------------------------------------------
// POST /api/oauth/authorize/decision — Consent decision (Clerk-authed)
//
// Called by the dashboard consent page after the user approves or denies.
// Verifies the chosen project belongs to the user's Clerk org, re-validates the
// client + redirect + scopes, and issues an authorization code on approval.
// ---------------------------------------------------------------------------

app.post("/authorize/decision", clerkDashboardAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorResponse(c, "BAD_REQUEST", "Invalid JSON body", 400);
  }
  const b = body as Record<string, unknown>;

  const approve = b.approve === true;
  const clientId = typeof b.client_id === "string" ? b.client_id : "";
  const redirectUri = typeof b.redirect_uri === "string" ? b.redirect_uri : "";
  const state = typeof b.state === "string" ? b.state : "";
  const codeChallenge = typeof b.code_challenge === "string" ? b.code_challenge : "";
  const codeChallengeMethod =
    typeof b.code_challenge_method === "string" ? b.code_challenge_method : "S256";
  const resource = typeof b.resource === "string" ? b.resource : null;
  const projectId = typeof b.project_id === "string" ? b.project_id : "";
  const scopes = Array.isArray(b.scopes)
    ? b.scopes.filter((s): s is string => typeof s === "string")
    : [];

  if (!clientId || !redirectUri) {
    return errorResponse(c, "BAD_REQUEST", "client_id and redirect_uri are required", 400);
  }

  const db = c.get("db");
  const client = await getClient(db, clientId);
  if (!client) {
    return errorResponse(c, "INVALID_CLIENT", "Unknown client_id", 400);
  }
  // Re-validate exact redirect_uri match — never trust the body alone.
  const registered = parseRedirectUris(client.redirectUris);
  if (!registered.includes(redirectUri)) {
    return errorResponse(c, "INVALID_REQUEST", "redirect_uri does not match", 400);
  }

  // Deny: redirect back to the client with an OAuth error.
  if (!approve) {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    return c.json({ redirect: url.toString() });
  }

  // Approve requires PKCE and a valid project the user actually owns.
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return errorResponse(c, "INVALID_REQUEST", "code_challenge (S256) is required", 400);
  }
  if (!projectId) {
    return errorResponse(c, "BAD_REQUEST", "project_id is required to approve", 400);
  }
  // Reject the global wildcard for OAuth clients — a third-party client must
  // request concrete scopes or per-resource wildcards (e.g. "state:*"), never
  // unrestricted full access. Resource wildcards and concrete scopes are OK.
  if (scopes.length === 0 || scopes.includes(WILDCARD_SCOPE) || !scopes.every(isGrantableScope)) {
    return errorResponse(c, "INVALID_SCOPE", "One or more requested scopes are not grantable", 400);
  }

  // Verify the project belongs to the authenticated Clerk org.
  const clerkOrgId = c.get("orgId");
  const clerkUserId = c.get("clerkUserId") ?? null;
  if (!clerkOrgId) {
    return errorResponse(c, "FORBIDDEN", "No active organization", 403);
  }
  const [[org], [project]] = await Promise.all([
    db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrgId, clerkOrgId))
      .limit(1),
    db.select({ orgId: projects.orgId }).from(projects).where(eq(projects.id, projectId)).limit(1),
  ]);
  if (!org || !project || project.orgId !== org.id) {
    // 404 (not 403) avoids leaking the existence of other orgs' projects.
    return errorResponse(c, "NOT_FOUND", "Project not found", 404);
  }

  const code = await createAuthorizationCode(db, {
    clientId,
    projectId,
    orgId: org.id,
    userId: clerkUserId,
    scopes,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    resource,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return c.json({ redirect: url.toString() });
});

// ---------------------------------------------------------------------------
// POST /api/oauth/token — Token endpoint (public; form-encoded or JSON)
// ---------------------------------------------------------------------------

app.post("/token", async (c) => {
  const body = await parseTokenBody(c);
  const grantType = body.grant_type;
  const db = c.get("db");

  try {
    if (grantType === "authorization_code") {
      const { code, code_verifier, client_id, redirect_uri } = body;
      if (!code || !code_verifier || !client_id || !redirect_uri) {
        return oauthError(
          c,
          "invalid_request",
          "code, code_verifier, client_id and redirect_uri are required",
        );
      }
      const tokens = await exchangeAuthorizationCode(db, {
        code,
        codeVerifier: code_verifier,
        clientId: client_id,
        redirectUri: redirect_uri,
      });
      return c.json(tokens);
    }

    if (grantType === "refresh_token") {
      const { refresh_token, client_id } = body;
      if (!refresh_token || !client_id) {
        return oauthError(c, "invalid_request", "refresh_token and client_id are required");
      }
      const tokens = await refreshAccessToken(db, {
        refreshToken: refresh_token,
        clientId: client_id,
      });
      return c.json(tokens);
    }

    return oauthError(c, "unsupported_grant_type", "Unsupported grant_type");
  } catch (err) {
    if (err instanceof OAuthError) {
      return oauthError(c, err.code, err.description, err.status);
    }
    throw err;
  }
});

export default app;
