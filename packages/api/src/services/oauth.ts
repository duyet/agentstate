import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  capabilityTokens,
  type OAuthClient,
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
} from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { generateId, generateOAuthSecret } from "../lib/id";
import { parseScopesJson } from "../lib/scopes";
import { encodeJson } from "../lib/state-json";
import type { CapabilityScope } from "../lib/validation";
import { createCapabilityToken } from "./capability-tokens";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Authorization codes are single-use and short-lived (RFC 6749 §4.1.2). */
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Access tokens (capability tokens) live one hour. */
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Refresh tokens live 30 days; rotated on every use. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Redirect URI validation
// ---------------------------------------------------------------------------

/**
 * A redirect URI is acceptable only if it is an https URL or a loopback http
 * URL (localhost / 127.0.0.1 / [::1]). Anything else (custom schemes, http to a
 * remote host) is rejected — prevents open-redirect and credential leakage.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:") {
    // URL normalizes IPv6 loopback to "::1" (brackets stripped).
    const host = parsed.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }
  return false;
}

// ---------------------------------------------------------------------------
// PKCE (RFC 7636, S256 only)
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Compute the S256 PKCE challenge: base64url(SHA-256(code_verifier)). */
export async function computeS256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Verify a PKCE code_verifier against a stored S256 challenge.
 * Constant-time-ish compare via length + char equality on the derived hash.
 */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  const computed = await computeS256Challenge(verifier);
  if (computed.length !== challenge.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ challenge.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function parseRedirectUris(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

export async function getClient(
  db: DrizzleD1Database,
  clientId: string,
): Promise<OAuthClient | null> {
  const [client] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.id, clientId))
    .limit(1);
  return client ?? null;
}

export interface RegisterClientInput {
  client_name: string;
  redirect_uris: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: string;
}

export interface RegisteredClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
  client_secret?: string;
}

/**
 * Register a new OAuth client (RFC 7591 Dynamic Client Registration).
 * Confidential clients (auth method other than "none") receive a secret once;
 * only its SHA-256 hash is stored.
 */
export async function registerClient(
  db: DrizzleD1Database,
  input: RegisterClientInput,
): Promise<RegisteredClient> {
  const grantTypes = input.grant_types?.length
    ? input.grant_types
    : ["authorization_code", "refresh_token"];
  const authMethod = input.token_endpoint_auth_method ?? "none";
  const isPublic = authMethod === "none";

  const clientId = generateId();
  const clientSecret = isPublic ? undefined : generateOAuthSecret();
  const now = Date.now();

  await db.insert(oauthClients).values({
    id: clientId,
    clientSecretHash: clientSecret ? await hashApiKey(clientSecret) : null,
    clientName: input.client_name,
    redirectUris: encodeJson(input.redirect_uris),
    grantTypes: encodeJson(grantTypes),
    tokenEndpointAuthMethod: authMethod,
    createdAt: now,
  });

  return {
    client_id: clientId,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    grant_types: grantTypes,
    token_endpoint_auth_method: authMethod,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
  };
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export interface CreateAuthCodeInput {
  clientId: string;
  projectId: string;
  orgId: string | null;
  userId: string | null;
  scopes: string[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string | null;
}

/**
 * Issue a single-use authorization code. Returns the raw code (only its hash is
 * stored). Bound to client, redirect URI, PKCE challenge, scopes, project, org,
 * granting user, and resource.
 */
export async function createAuthorizationCode(
  db: DrizzleD1Database,
  input: CreateAuthCodeInput,
): Promise<string> {
  const code = generateOAuthSecret();
  const now = Date.now();
  await db.insert(oauthAuthorizationCodes).values({
    id: generateId(),
    codeHash: await hashApiKey(code),
    clientId: input.clientId,
    projectId: input.projectId,
    orgId: input.orgId,
    userId: input.userId,
    scopes: encodeJson(input.scopes),
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
    resource: input.resource,
    expiresAt: now + AUTH_CODE_TTL_MS,
    createdAt: now,
  });
  return code;
}

// ---------------------------------------------------------------------------
// Token issuance
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Mint an access token (capability token) + refresh token for a granted scope
 * set. Shared by the authorization_code and refresh_token grants.
 */
async function issueTokens(
  db: DrizzleD1Database,
  params: { clientId: string; clientName: string; projectId: string; scopes: string[] },
): Promise<TokenResponse> {
  const now = Date.now();
  const accessToken = await createCapabilityToken(db, params.projectId, {
    name: `oauth:${params.clientName}`,
    // OAuth scopes are stored/validated as plain strings (see scoped-auth.ts);
    // the CapabilityScope[] type is structurally satisfied at runtime.
    scopes: params.scopes as CapabilityScope[],
    expires_at: now + ACCESS_TOKEN_TTL_MS,
  });

  const refreshToken = generateOAuthSecret();
  await db.insert(oauthRefreshTokens).values({
    id: generateId(),
    tokenHash: await hashApiKey(refreshToken),
    clientId: params.clientId,
    projectId: params.projectId,
    accessTokenId: accessToken.id,
    scopes: encodeJson(params.scopes),
    expiresAt: now + REFRESH_TOKEN_TTL_MS,
    createdAt: now,
  });

  return {
    access_token: accessToken.token,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: params.scopes.join(" "),
  };
}

export class OAuthError extends Error {
  constructor(
    readonly code: "invalid_request" | "invalid_grant" | "invalid_client",
    readonly description: string,
    readonly status: 400 | 401 = 400,
  ) {
    super(description);
    this.name = "OAuthError";
  }
}

export interface AuthCodeGrantInput {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

/**
 * Exchange an authorization code for tokens (grant_type=authorization_code).
 * Enforces single-use, expiry, client/redirect binding, and PKCE S256.
 */
export async function exchangeAuthorizationCode(
  db: DrizzleD1Database,
  input: AuthCodeGrantInput,
): Promise<TokenResponse> {
  const codeHash = await hashApiKey(input.code);
  const [row] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, codeHash))
    .limit(1);

  if (!row) throw new OAuthError("invalid_grant", "Authorization code not found");
  if (row.consumedAt != null) {
    throw new OAuthError("invalid_grant", "Authorization code already used");
  }
  if (row.expiresAt < Date.now()) {
    throw new OAuthError("invalid_grant", "Authorization code expired");
  }
  if (row.clientId !== input.clientId) {
    throw new OAuthError("invalid_grant", "client_id mismatch");
  }
  if (row.redirectUri !== input.redirectUri) {
    throw new OAuthError("invalid_grant", "redirect_uri mismatch");
  }
  if (!(await verifyPkceS256(input.codeVerifier, row.codeChallenge))) {
    throw new OAuthError("invalid_grant", "PKCE verification failed");
  }

  // Single-use: mark consumed atomically, guarding against a concurrent replay
  // that already consumed it (consumedAt IS NULL guard).
  const consumed = await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: Date.now() })
    .where(and(eq(oauthAuthorizationCodes.id, row.id), isNull(oauthAuthorizationCodes.consumedAt)))
    .returning({ id: oauthAuthorizationCodes.id });
  if (consumed.length === 0) {
    throw new OAuthError("invalid_grant", "Authorization code already used");
  }

  const client = await getClient(db, row.clientId);
  return issueTokens(db, {
    clientId: row.clientId,
    clientName: client?.clientName ?? row.clientId,
    projectId: row.projectId,
    scopes: parseScopesJson(row.scopes),
  });
}

export interface RefreshGrantInput {
  refreshToken: string;
  /**
   * Public clients MUST identify themselves at the token endpoint (OAuth 2.1
   * §4.3.2). Always provided by the route; the binding is enforced below.
   */
  clientId: string;
}

/**
 * Rotate a refresh token (grant_type=refresh_token). The presented token and
 * its companion access token are revoked, and a fresh access + refresh token
 * pair with the same scopes is issued (OAuth 2.1 mandates rotation for public
 * clients; RFC 6819 §5.2.2.3 mandates revoking the old access token).
 */
export async function refreshAccessToken(
  db: DrizzleD1Database,
  input: RefreshGrantInput,
): Promise<TokenResponse> {
  const tokenHash = await hashApiKey(input.refreshToken);
  const now = Date.now();
  const [row] = await db
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
        or(isNull(oauthRefreshTokens.expiresAt), gt(oauthRefreshTokens.expiresAt, now)),
      ),
    )
    .limit(1);

  if (!row) throw new OAuthError("invalid_grant", "Refresh token invalid or expired");
  // Client binding is mandatory — a refresh token may only be redeemed by the
  // client it was issued to.
  if (row.clientId !== input.clientId) {
    throw new OAuthError("invalid_grant", "client_id mismatch");
  }

  // Rotate: revoke the presented token, guarding against concurrent reuse.
  const rotated = await db
    .update(oauthRefreshTokens)
    .set({ rotatedAt: now, revokedAt: now })
    .where(and(eq(oauthRefreshTokens.id, row.id), isNull(oauthRefreshTokens.revokedAt)))
    .returning({ id: oauthRefreshTokens.id });
  if (rotated.length === 0) {
    throw new OAuthError("invalid_grant", "Refresh token already used");
  }

  // Revoke the companion access token so a rotated/compromised token family
  // cannot keep using the previously-issued access token.
  if (row.accessTokenId) {
    await db
      .update(capabilityTokens)
      .set({ revokedAt: now })
      .where(eq(capabilityTokens.id, row.accessTokenId));
  }

  const client = await getClient(db, row.clientId);
  return issueTokens(db, {
    clientId: row.clientId,
    clientName: client?.clientName ?? row.clientId,
    projectId: row.projectId,
    scopes: parseScopesJson(row.scopes),
  });
}
