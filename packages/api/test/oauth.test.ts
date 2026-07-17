import { env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashApiKey } from "../src/lib/crypto";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyMigrations, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// PKCE helpers (mirror the server's S256 implementation)
// ---------------------------------------------------------------------------

function base64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function insertClient(input: {
  id: string;
  redirectUris: string[];
  name?: string;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO oauth_clients (id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at)
     VALUES (?, NULL, ?, ?, '["authorization_code","refresh_token"]', 'none', ?)`,
  )
    .bind(input.id, input.name ?? "Test Client", JSON.stringify(input.redirectUris), Date.now())
    .run();
}

async function insertAuthCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  expiresAt?: number;
}): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO oauth_authorization_codes
      (id, code_hash, client_id, project_id, org_id, user_id, scopes, redirect_uri, code_challenge, code_challenge_method, resource, expires_at, created_at)
     VALUES (?, ?, ?, ?, NULL, 'user_test_001', ?, ?, ?, 'S256', NULL, ?, ?)`,
  )
    .bind(
      `code_${Math.random().toString(36).slice(2)}`,
      await hashApiKey(input.code),
      input.clientId,
      TEST_PROJECT_ID,
      JSON.stringify(input.scopes),
      input.redirectUri,
      input.codeChallenge,
      input.expiresAt ?? now + 600_000,
      now,
    )
    .run();
}

async function resetOAuthTables(): Promise<void> {
  await env.DB.prepare("DELETE FROM oauth_refresh_tokens").run();
  await env.DB.prepare("DELETE FROM oauth_authorization_codes").run();
  await env.DB.prepare("DELETE FROM oauth_clients").run();
  await env.DB.prepare("DELETE FROM capability_tokens").run();
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

const REDIRECT = "http://localhost:9999/cb";

describe("OAuth 2.1 server", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  beforeEach(async () => {
    await resetOAuthTables();
  });

  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  describe("discovery", () => {
    it("serves protected-resource metadata (RFC 9728)", async () => {
      const res = await SELF.fetch("http://localhost/.well-known/oauth-protected-resource");
      expect(res.status).toBe(200);
      const body = await res.json<{
        resource: string;
        authorization_servers: string[];
        scopes_supported: string[];
        bearer_methods_supported: string[];
      }>();
      expect(body.resource).toBe("http://localhost/api/mcp");
      expect(body.authorization_servers).toEqual(["http://localhost"]);
      expect(body.scopes_supported).toContain("conversations:read");
      expect(body.bearer_methods_supported).toEqual(["header"]);
    });

    it("serves authorization-server metadata (RFC 8414)", async () => {
      const res = await SELF.fetch("http://localhost/.well-known/oauth-authorization-server");
      expect(res.status).toBe(200);
      const body = await res.json<{
        issuer: string;
        authorization_endpoint: string;
        token_endpoint: string;
        registration_endpoint: string;
        code_challenge_methods_supported: string[];
        grant_types_supported: string[];
        response_types_supported: string[];
      }>();
      expect(body.issuer).toBe("http://localhost");
      expect(body.authorization_endpoint).toBe("http://localhost/api/oauth/authorize");
      expect(body.token_endpoint).toBe("http://localhost/api/oauth/token");
      expect(body.registration_endpoint).toBe("http://localhost/api/oauth/register");
      expect(body.code_challenge_methods_supported).toEqual(["S256"]);
      expect(body.grant_types_supported).toContain("refresh_token");
      expect(body.response_types_supported).toEqual(["code"]);
    });
  });

  // -------------------------------------------------------------------------
  // Dynamic Client Registration (RFC 7591)
  // -------------------------------------------------------------------------

  describe("POST /api/oauth/register", () => {
    it("registers a public client and returns a client_id (no secret)", async () => {
      const res = await SELF.fetch("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: "Test", redirect_uris: [REDIRECT] }),
      });
      expect(res.status).toBe(201);
      const body = await res.json<{
        client_id: string;
        client_secret?: string;
        redirect_uris: string[];
        token_endpoint_auth_method: string;
      }>();
      expect(body.client_id).toBeTruthy();
      expect(body.client_secret).toBeUndefined();
      expect(body.redirect_uris).toEqual([REDIRECT]);
      expect(body.token_endpoint_auth_method).toBe("none");
    });

    it("returns a secret for confidential clients", async () => {
      const res = await SELF.fetch("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Conf",
          redirect_uris: ["https://app.example.com/cb"],
          token_endpoint_auth_method: "client_secret_post",
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json<{ client_secret?: string }>();
      expect(body.client_secret).toBeTruthy();
    });

    it("rejects non-https/non-localhost redirect URIs", async () => {
      const res = await SELF.fetch("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: "Bad", redirect_uris: ["http://evil.com/cb"] }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects missing redirect_uris", async () => {
      const res = await SELF.fetch("http://localhost/api/oauth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: "Bad" }),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization endpoint
  // -------------------------------------------------------------------------

  describe("GET /api/oauth/authorize", () => {
    it("redirects valid requests to the dashboard consent page", async () => {
      await insertClient({ id: "client_a", redirectUris: [REDIRECT] });
      const challenge = await s256("verifier-123-verifier-123-verifier-123-ok");
      const url = new URL("http://localhost/api/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", "client_a");
      url.searchParams.set("redirect_uri", REDIRECT);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("scope", "conversations:read");
      url.searchParams.set("state", "xyz");

      const res = await SELF.fetch(url.toString(), { redirect: "manual" });
      expect(res.status).toBe(302);
      const location = res.headers.get("Location") ?? "";
      const loc = new URL(location);
      expect(loc.pathname).toBe("/oauth/consent");
      expect(loc.searchParams.get("client_id")).toBe("client_a");
      expect(loc.searchParams.get("code_challenge")).toBe(challenge);
      expect(loc.searchParams.get("state")).toBe("xyz");
    });

    it("returns 400 (no redirect) for an unknown client", async () => {
      const url = new URL("http://localhost/api/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", "nope");
      url.searchParams.set("redirect_uri", REDIRECT);
      url.searchParams.set("code_challenge", "abc");
      url.searchParams.set("code_challenge_method", "S256");
      const res = await SELF.fetch(url.toString(), { redirect: "manual" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for a redirect_uri not registered to the client", async () => {
      await insertClient({ id: "client_b", redirectUris: [REDIRECT] });
      const url = new URL("http://localhost/api/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", "client_b");
      url.searchParams.set("redirect_uri", "http://localhost:9999/evil");
      url.searchParams.set("code_challenge", "abc");
      url.searchParams.set("code_challenge_method", "S256");
      const res = await SELF.fetch(url.toString(), { redirect: "manual" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when PKCE is missing", async () => {
      await insertClient({ id: "client_c", redirectUris: [REDIRECT] });
      const url = new URL("http://localhost/api/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", "client_c");
      url.searchParams.set("redirect_uri", REDIRECT);
      const res = await SELF.fetch(url.toString(), { redirect: "manual" });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Consent decision endpoint (Clerk-authed)
  // -------------------------------------------------------------------------

  describe("POST /api/oauth/authorize/decision", () => {
    const challengeP = s256("decision-verifier-decision-verifier-decision");

    it("requires a Clerk session", async () => {
      await insertClient({ id: "client_d", redirectUris: [REDIRECT] });
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true, client_id: "client_d", redirect_uri: REDIRECT }),
      });
      expect(res.status).toBe(401);
    });

    it("issues a code on approval and returns a redirect with code+state", async () => {
      await insertClient({ id: "client_e", redirectUris: [REDIRECT] });
      const token = await signTestSessionToken();
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
        body: JSON.stringify({
          approve: true,
          client_id: "client_e",
          redirect_uri: REDIRECT,
          scopes: ["conversations:read"],
          code_challenge: await challengeP,
          code_challenge_method: "S256",
          state: "st8",
          project_id: TEST_PROJECT_ID,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ redirect: string }>();
      const loc = new URL(body.redirect);
      expect(loc.origin + loc.pathname).toBe(REDIRECT);
      expect(loc.searchParams.get("code")).toBeTruthy();
      expect(loc.searchParams.get("state")).toBe("st8");

      // The code is persisted (single row).
      const count = await env.DB.prepare(
        "SELECT COUNT(*) as n FROM oauth_authorization_codes",
      ).first<{ n: number }>();
      expect(count?.n).toBe(1);
    });

    it("returns access_denied redirect on deny", async () => {
      await insertClient({ id: "client_f", redirectUris: [REDIRECT] });
      const token = await signTestSessionToken();
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
        body: JSON.stringify({
          approve: false,
          client_id: "client_f",
          redirect_uri: REDIRECT,
          state: "st9",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ redirect: string }>();
      const loc = new URL(body.redirect);
      expect(loc.searchParams.get("error")).toBe("access_denied");
      expect(loc.searchParams.get("state")).toBe("st9");
    });

    it("rejects approving a project from another org (404)", async () => {
      await insertClient({ id: "client_g", redirectUris: [REDIRECT] });
      const token = await signTestSessionToken({ orgId: "clerk_other_org_999" });
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
        body: JSON.stringify({
          approve: true,
          client_id: "client_g",
          redirect_uri: REDIRECT,
          scopes: ["conversations:read"],
          code_challenge: await challengeP,
          code_challenge_method: "S256",
          project_id: TEST_PROJECT_ID,
        }),
      });
      expect(res.status).toBe(404);
    });

    it("rejects ungrantable scopes", async () => {
      await insertClient({ id: "client_h", redirectUris: [REDIRECT] });
      const token = await signTestSessionToken();
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
        body: JSON.stringify({
          approve: true,
          client_id: "client_h",
          redirect_uri: REDIRECT,
          scopes: ["not:a:scope"],
          code_challenge: await challengeP,
          code_challenge_method: "S256",
          project_id: TEST_PROJECT_ID,
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Token endpoint — authorization_code grant
  // -------------------------------------------------------------------------

  describe("POST /api/oauth/token (authorization_code)", () => {
    it("exchanges a code+verifier for an as_cap_ access token + refresh token", async () => {
      const verifier = "tok-verifier-tok-verifier-tok-verifier-okok";
      const challenge = await s256(verifier);
      await insertClient({ id: "client_t1", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode1",
        clientId: "client_t1",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read", "state:write"],
      });

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "rawcode1",
          code_verifier: verifier,
          client_id: "client_t1",
          redirect_uri: REDIRECT,
        }).toString(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<TokenResponse>();
      expect(body.access_token.startsWith("as_cap_")).toBe(true);
      expect(body.token_type).toBe("Bearer");
      expect(body.expires_in).toBe(3600);
      expect(body.refresh_token).toBeTruthy();
      expect(body.scope).toBe("conversations:read state:write");

      // The access token exists in capability_tokens (by hash).
      const hash = await hashApiKey(body.access_token);
      const row = await env.DB.prepare(
        "SELECT project_id, scopes FROM capability_tokens WHERE key_hash = ?",
      )
        .bind(hash)
        .first<{ project_id: string; scopes: string }>();
      expect(row?.project_id).toBe(TEST_PROJECT_ID);

      // A refresh token row exists.
      const rt = await env.DB.prepare("SELECT COUNT(*) as n FROM oauth_refresh_tokens").first<{
        n: number;
      }>();
      expect(rt?.n).toBe(1);
    });

    it("accepts a JSON token body too", async () => {
      const verifier = "json-verifier-json-verifier-json-verifier-ok";
      const challenge = await s256(verifier);
      await insertClient({ id: "client_t2", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode2",
        clientId: "client_t2",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "rawcode2",
          code_verifier: verifier,
          client_id: "client_t2",
          redirect_uri: REDIRECT,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<TokenResponse>();
      expect(body.access_token.startsWith("as_cap_")).toBe(true);
    });

    it("rejects a PKCE mismatch with invalid_grant", async () => {
      const challenge = await s256("the-real-verifier-the-real-verifier-okok");
      await insertClient({ id: "client_t3", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode3",
        clientId: "client_t3",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "rawcode3",
          code_verifier: "WRONG-verifier-WRONG-verifier-WRONG-verifier",
          client_id: "client_t3",
          redirect_uri: REDIRECT,
        }).toString(),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });

    it("requires the client_secret for a confidential client (#263)", async () => {
      const verifier = "conf-verifier-conf-verifier-conf-verifier-ok";
      const challenge = await s256(verifier);
      const secret = "super-secret-value-1234567890";
      // Confidential client: client_secret_post, secret hash stored.
      await env.DB.prepare(
        `INSERT INTO oauth_clients (id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at)
         VALUES (?, ?, 'Conf', ?, '["authorization_code","refresh_token"]', 'client_secret_post', ?)`,
      )
        .bind("client_conf", await hashApiKey(secret), JSON.stringify([REDIRECT]), Date.now())
        .run();
      await insertAuthCode({
        code: "confcode1",
        clientId: "client_conf",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const exchange = (extra: Record<string, string>) =>
        SELF.fetch("http://localhost/api/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: "confcode1",
            code_verifier: verifier,
            client_id: "client_conf",
            redirect_uri: REDIRECT,
            ...extra,
          }).toString(),
        });

      // Missing secret → invalid_client (401), code NOT consumed.
      const noSecret = await exchange({});
      expect(noSecret.status).toBe(401);
      expect((await noSecret.json<{ error: string }>()).error).toBe("invalid_client");

      // Wrong secret → invalid_client (401).
      const wrongSecret = await exchange({ client_secret: "nope" });
      expect(wrongSecret.status).toBe(401);

      // Correct secret → success.
      const ok = await exchange({ client_secret: secret });
      expect(ok.status).toBe(200);
      expect((await ok.json<TokenResponse>()).access_token.startsWith("as_cap_")).toBe(true);
    });

    it("accepts client_secret_basic for a confidential client (#263)", async () => {
      const verifier = "basic-verifier-basic-verifier-basic-verifier";
      const challenge = await s256(verifier);
      const secret = "basic-secret-abcdefghijklmnop";
      await env.DB.prepare(
        `INSERT INTO oauth_clients (id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at)
         VALUES (?, ?, 'ConfBasic', ?, '["authorization_code","refresh_token"]', 'client_secret_basic', ?)`,
      )
        .bind("client_basic", await hashApiKey(secret), JSON.stringify([REDIRECT]), Date.now())
        .run();
      await insertAuthCode({
        code: "basiccode1",
        clientId: "client_basic",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const basic = btoa(`client_basic:${secret}`);
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "basiccode1",
          code_verifier: verifier,
          client_id: "client_basic",
          redirect_uri: REDIRECT,
        }).toString(),
      });
      expect(res.status).toBe(200);
    });

    it("rejects reusing a consumed code", async () => {
      const verifier = "reuse-verifier-reuse-verifier-reuse-verifier";
      const challenge = await s256(verifier);
      await insertClient({ id: "client_t4", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode4",
        clientId: "client_t4",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const exchange = () =>
        SELF.fetch("http://localhost/api/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: "rawcode4",
            code_verifier: verifier,
            client_id: "client_t4",
            redirect_uri: REDIRECT,
          }).toString(),
        });

      const first = await exchange();
      expect(first.status).toBe(200);
      const second = await exchange();
      expect(second.status).toBe(400);
      const body = await second.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });

    it("rejects a redirect_uri mismatch with invalid_grant", async () => {
      const verifier = "mm-verifier-mm-verifier-mm-verifier-mm-okok";
      const challenge = await s256(verifier);
      await insertClient({ id: "client_t5", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode5",
        clientId: "client_t5",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "rawcode5",
          code_verifier: verifier,
          client_id: "client_t5",
          redirect_uri: "http://localhost:9999/other",
        }).toString(),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });
  });

  // -------------------------------------------------------------------------
  // Token endpoint — refresh_token grant (rotation)
  // -------------------------------------------------------------------------

  describe("POST /api/oauth/token (refresh_token)", () => {
    async function mintInitialTokens(): Promise<TokenResponse> {
      const verifier = "rt-verifier-rt-verifier-rt-verifier-rt-okok";
      const challenge = await s256(verifier);
      await insertClient({ id: "client_rt", redirectUris: [REDIRECT] });
      await insertAuthCode({
        code: "rawcode_rt",
        clientId: "client_rt",
        redirectUri: REDIRECT,
        codeChallenge: challenge,
        scopes: ["conversations:read"],
      });
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "rawcode_rt",
          code_verifier: verifier,
          client_id: "client_rt",
          redirect_uri: REDIRECT,
        }).toString(),
      });
      return res.json<TokenResponse>();
    }

    it("rotates the refresh token and issues a new access token", async () => {
      const initial = await mintInitialTokens();

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initial.refresh_token,
          client_id: "client_rt",
        }).toString(),
      });
      expect(res.status).toBe(200);
      const rotated = await res.json<TokenResponse>();
      expect(rotated.access_token.startsWith("as_cap_")).toBe(true);
      expect(rotated.refresh_token).not.toBe(initial.refresh_token);
      expect(rotated.scope).toBe("conversations:read");
    });

    it("rejects reusing a rotated (revoked) refresh token", async () => {
      const initial = await mintInitialTokens();
      const refresh = () =>
        SELF.fetch("http://localhost/api/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: initial.refresh_token,
            client_id: "client_rt",
          }).toString(),
        });

      const first = await refresh();
      expect(first.status).toBe(200);
      const second = await refresh();
      expect(second.status).toBe(400);
      const body = await second.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });

    it("rejects an unknown refresh token", async () => {
      // The client must exist: an unknown client_id fails earlier with
      // invalid_client (#278); this test targets the token-lookup path.
      await insertClient({ id: "client_rt", redirectUris: [REDIRECT] });
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "does-not-exist",
          client_id: "client_rt",
        }).toString(),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });

    it("requires client_id on the refresh grant (OAuth 2.1 §4.3.2)", async () => {
      const initial = await mintInitialTokens();
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initial.refresh_token,
        }).toString(),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_request");
    });

    it("rejects a refresh token redeemed with the wrong (unregistered) client_id", async () => {
      // An unknown client_id now fails client authentication uniformly (#278)
      // instead of leaking through to a later invalid_grant.
      const initial = await mintInitialTokens();
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initial.refresh_token,
          client_id: "some_other_client",
        }).toString(),
      });
      expect(res.status).toBe(401);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_client");
    });

    it("rejects a refresh token redeemed by a different registered client with invalid_grant", async () => {
      // Client-binding enforcement (distinct from client authentication): a
      // real, registered client presenting someone else's refresh token.
      const initial = await mintInitialTokens();
      await insertClient({ id: "client_rt_other", redirectUris: [REDIRECT] });
      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initial.refresh_token,
          client_id: "client_rt_other",
        }).toString(),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("invalid_grant");
    });

    it("revokes the prior access token when rotating (RFC 6819)", async () => {
      const initial = await mintInitialTokens();
      // The initial access token works (exists, not revoked).
      const oldHash = await hashApiKey(initial.access_token);
      const before = await env.DB.prepare(
        "SELECT revoked_at FROM capability_tokens WHERE key_hash = ?",
      )
        .bind(oldHash)
        .first<{ revoked_at: number | null }>();
      expect(before?.revoked_at).toBeNull();

      const res = await SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: initial.refresh_token,
          client_id: "client_rt",
        }).toString(),
      });
      expect(res.status).toBe(200);

      // After rotation, the old access token is revoked.
      const after = await env.DB.prepare(
        "SELECT revoked_at FROM capability_tokens WHERE key_hash = ?",
      )
        .bind(oldHash)
        .first<{ revoked_at: number | null }>();
      expect(after?.revoked_at).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Wildcard scope is not OAuth-grantable
  // -------------------------------------------------------------------------

  describe("global wildcard scope", () => {
    it("rejects approving the '*' scope at /authorize/decision", async () => {
      await insertClient({ id: "client_wc", redirectUris: [REDIRECT] });
      const token = await signTestSessionToken();
      const challenge = await s256("wc-verifier-wc-verifier-wc-verifier-wc-ok");
      const res = await SELF.fetch("http://localhost/api/oauth/authorize/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
        body: JSON.stringify({
          approve: true,
          client_id: "client_wc",
          redirect_uri: REDIRECT,
          scopes: ["*"],
          code_challenge: challenge,
          code_challenge_method: "S256",
          project_id: TEST_PROJECT_ID,
        }),
      });
      expect(res.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// Client-existence oracle (#278)
// ---------------------------------------------------------------------------

describe("POST /api/oauth/token — client-existence oracle (#278)", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  it("returns an identical response for an unknown client_id and a confidential client with a wrong secret", async () => {
    // WHY: pre-#278, an unknown client_id fell through to a later 400
    // invalid_grant while a known confidential client with a wrong secret got
    // an immediate 401 invalid_client — a response-shape oracle revealing
    // which client_ids exist as confidential clients.
    await env.DB.prepare(
      `INSERT INTO oauth_clients (id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at)
       VALUES (?, ?, 'OracleConf', ?, '["authorization_code","refresh_token"]', 'client_secret_post', ?)`,
    )
      .bind(
        "client_oracle_conf",
        await hashApiKey("real-secret-for-oracle-test"),
        JSON.stringify(["http://localhost:8788/cb"]),
        Date.now(),
      )
      .run();

    const probe = (clientId: string, withSecret: boolean) =>
      SELF.fetch("http://localhost/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "garbage-code",
          code_verifier: "garbage-verifier-garbage-verifier-garbage-ok",
          client_id: clientId,
          redirect_uri: "http://localhost:8788/cb",
          ...(withSecret ? { client_secret: "wrong-secret" } : {}),
        }).toString(),
      });

    // With a (wrong) secret presented.
    const [unknownWithSecret, confWrongSecret] = [
      await probe("client_does_not_exist", true),
      await probe("client_oracle_conf", true),
    ];
    expect(unknownWithSecret.status).toBe(confWrongSecret.status);
    expect(unknownWithSecret.status).toBe(401);
    expect(await unknownWithSecret.json()).toEqual(await confWrongSecret.json());

    // With no secret presented.
    const [unknownNoSecret, confNoSecret] = [
      await probe("client_does_not_exist", false),
      await probe("client_oracle_conf", false),
    ];
    expect(unknownNoSecret.status).toBe(confNoSecret.status);
    expect(unknownNoSecret.status).toBe(401);
    expect(await unknownNoSecret.json()).toEqual(await confNoSecret.json());
  });
});
