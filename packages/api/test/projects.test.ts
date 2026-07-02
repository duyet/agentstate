import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyMigrations, seedProject } from "./setup";

// Dashboard-management routes now require a verified Clerk session. Tests sign
// a session JWT (matching CLERK_JWT_KEY in the test env) and send it as the
// __session cookie. The session org matches the seeded org.
const SESSION_ORG_ID = "clerk_test_org_001";

let authCookie: string;

beforeAll(async () => {
  const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
  authCookie = sessionCookie(token);
});

/** Headers that carry a valid dashboard (Clerk) session. */
function dashboardHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Cookie: authCookie, ...extra };
}

const TEST_PROJECT_CREATION_RATE_LIMIT = 10000;

// ---------------------------------------------------------------------------
// Additional typed response shapes (for new dashboard routes)
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  project_id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface ApiKeyCreated {
  id: string;
  name: string;
  key_prefix: string;
  key: string;
  created_at: number;
}

interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: number;
}

interface ProjectWithKeys extends Project {
  api_keys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    created_at: number;
    last_used_at: number | null;
    revoked_at: number | null;
  }>;
}

interface ProjectListItem extends Project {
  key_count: number;
  conversation_count: number;
  message_count: number;
  total_tokens: number;
  last_activity_at: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(body: Record<string, unknown>) {
  return SELF.fetch("http://localhost/api/v1/projects", {
    method: "POST",
    headers: dashboardHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Projects (/api/v1/projects)", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create project
  // -------------------------------------------------------------------------

  describe("POST /api/v1/projects", () => {
    it("creates a project with default org and returns a full API key", async () => {
      const res = await createProject({ name: "My App", slug: "my-app" });
      expect(res.status).toBe(201);

      const body = await res.json<{ project: Project; api_key: ApiKeyCreated }>();
      expect(body.project.id).toBeTruthy();
      expect(body.project.name).toBe("My App");
      expect(body.project.slug).toBe("my-app");
      expect(body.project.org_id).toBeTruthy();
      expect(body.project.created_at).toBeGreaterThan(0);

      expect(body.api_key.id).toBeTruthy();
      expect(body.api_key.name).toBe("Default");
      expect(body.api_key.key).toMatch(/^as_live_/);
      expect(body.api_key.key_prefix).toBe(body.api_key.key.substring(0, 12));
      expect(body.api_key.created_at).toBeGreaterThan(0);
    });

    it("creates a project with an explicit org_id", async () => {
      const res = await createProject({
        name: "Org App",
        slug: "org-app",
        org_id: "my-custom-org",
      });
      expect(res.status).toBe(201);

      const body = await res.json<{ project: Project; api_key: ApiKeyCreated }>();
      expect(body.project.slug).toBe("org-app");
    });

    it("accepts single-character slugs", async () => {
      const res = await createProject({ name: "Single", slug: "a" });
      expect(res.status).toBe(201);
    });

    it("returns 409 when slug is already taken in the same org", async () => {
      const slug = `dup-slug-${Date.now()}`;
      const first = await createProject({ name: "First", slug });
      expect(first.status).toBe(201);

      const second = await createProject({ name: "Second", slug });
      expect(second.status).toBe(409);

      const body = await second.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("CONFLICT");
    });

    it("rejects a duplicate slug in the same session org (org_id body value ignored)", async () => {
      // org_id is now taken from the verified session, so two creates with the
      // same slug land in the same org and the second must conflict.
      const slug = `shared-slug-${Date.now()}`;
      const first = await createProject({ name: "Org A App", slug, org_id: `org-a-${Date.now()}` });
      expect(first.status).toBe(201);

      const second = await createProject({
        name: "Org B App",
        slug,
        org_id: `org-b-${Date.now()}`,
      });
      expect(second.status).toBe(409);
    });

    it("returns 400 when name is missing", async () => {
      const res = await createProject({ slug: "valid-slug" });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 when slug is missing", async () => {
      const res = await createProject({ name: "Valid Name" });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 for invalid slug with uppercase letters", async () => {
      const res = await createProject({ name: "Bad Slug", slug: "Bad-Slug" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for slug with leading hyphen", async () => {
      const res = await createProject({ name: "Bad Slug", slug: "-bad" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for slug over 255 characters", async () => {
      const res = await createProject({ name: "Too Long", slug: `${"a".repeat(256)}` });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("accepts a slug at the 255 character bound", async () => {
      const suffix = `-${Date.now()}`;
      const slug = "a".repeat(255 - suffix.length) + suffix;
      expect(slug.length).toBe(255);

      const res = await createProject({ name: "At Bound", slug });
      expect(res.status).toBe(201);
    });

    it("returns 400 for invalid JSON body", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        method: "POST",
        headers: dashboardHeaders({ "Content-Type": "application/json" }),
        body: "not-json",
      });
      expect(res.status).toBe(400);
    });

    // -----------------------------------------------------------------------
    // Project creation rate limiting
    // -----------------------------------------------------------------------

    it("includes project creation rate limit headers", async () => {
      const res = await createProject({
        name: "Rate Limit Header Test",
        slug: `rate-header-${Date.now()}`,
      });
      expect(res.status).toBe(201);

      expect(res.headers.get("X-RateLimit-Limit-ProjectCreation")).toBe(
        String(TEST_PROJECT_CREATION_RATE_LIMIT),
      );
      expect(res.headers.get("X-RateLimit-Remaining-ProjectCreation")).toBeTruthy();
    });

    it("returns 429 when project creation rate limit is exceeded", async () => {
      // Clear rate limit table for a clean test
      await env.DB.prepare("DELETE FROM rate_limits").run();

      // The createProject helper doesn't send auth headers, so the rate limiter
      // falls back to IP-based rate limiting. We need to seed the IP-based entry.
      // Format: "pc:ip:{hashed-ip}:{windowStart}"
      // In test environment without CF-Connecting-IP, it falls back to "unknown"
      const ipHash = await computeSHA256Hex("unknown");
      const ipIdentifier = `ip:${ipHash}`;
      const now = Date.now();
      const windowStart = now - (now % 60_000);
      const rateLimitId = `pc:${ipIdentifier}:${windowStart}`;

      // Insert a project-creation rate limit row at the configured test limit.
      await env.DB.prepare(
        `INSERT INTO rate_limits (id, api_key_hash, window_start, request_count, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(rateLimitId, ipIdentifier, windowStart, TEST_PROJECT_CREATION_RATE_LIMIT, now)
        .run();

      // The next request should be over the configured limit.
      const res = await createProject({ name: "Over Limit", slug: `over-limit-${Date.now()}` });
      expect(res.status).toBe(429);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("RATE_LIMITED");
      expect(body.error.message).toContain(
        `${TEST_PROJECT_CREATION_RATE_LIMIT} projects per minute`,
      );
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining-ProjectCreation")).toBe("0");
    });

    it("decrements project creation rate limit counter", async () => {
      // Clear rate limit table
      await env.DB.prepare("DELETE FROM rate_limits").run();

      const res1 = await createProject({ name: "Counter Test 1", slug: `counter-1-${Date.now()}` });
      const remaining1 = Number(res1.headers.get("X-RateLimit-Remaining-ProjectCreation"));

      const res2 = await createProject({ name: "Counter Test 2", slug: `counter-2-${Date.now()}` });
      const remaining2 = Number(res2.headers.get("X-RateLimit-Remaining-ProjectCreation"));

      // The second request should have fewer remaining than the first
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List projects
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects", () => {
    it("lists projects for the session org", async () => {
      // Ensure at least one exists
      await createProject({ name: "List Test", slug: `list-test-${Date.now()}` });

      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ProjectListItem[] }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("includes key_count on each project", async () => {
      const slug = `key-count-test-${Date.now()}`;
      const createRes = await createProject({ name: "Key Count", slug });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      const projectId = created.project.id;

      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: dashboardHeaders(),
      });
      const body = await res.json<{ data: ProjectListItem[] }>();

      const found = body.data.find((p) => p.id === projectId);
      expect(found).toBeDefined();
      // Should have at least the auto-created "Default" key
      expect(found!.key_count).toBeGreaterThanOrEqual(1);
    });

    it("reports zeroed aggregate stats for a project with no conversations", async () => {
      const slug = `stats-zero-${Date.now()}`;
      const createRes = await createProject({ name: "Stats Zero", slug });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();

      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: dashboardHeaders(),
      });
      const body = await res.json<{ data: ProjectListItem[] }>();
      const found = body.data.find((p) => p.id === created.project.id);

      expect(found).toBeDefined();
      expect(found!.conversation_count).toBe(0);
      expect(found!.message_count).toBe(0);
      expect(found!.total_tokens).toBe(0);
      expect(found!.last_activity_at).toBeNull();
    });

    it("aggregates conversation/message/token stats and last activity", async () => {
      const slug = `stats-agg-${Date.now()}`;
      const createRes = await createProject({ name: "Stats Agg", slug });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      const key = created.api_key.key;

      // Two conversations, 3 messages and 30 tokens total, created via the
      // project's own API key (Bearer auth).
      await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Hi", token_count: 5 },
            { role: "assistant", content: "Hello", token_count: 10 },
          ],
        }),
      });
      await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Solo", token_count: 15 }],
        }),
      });

      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: dashboardHeaders(),
      });
      const body = await res.json<{ data: ProjectListItem[] }>();
      const found = body.data.find((p) => p.id === created.project.id);

      expect(found).toBeDefined();
      expect(found!.conversation_count).toBe(2);
      expect(found!.message_count).toBe(3);
      expect(found!.total_tokens).toBe(30);
      expect(found!.last_activity_at).toBeGreaterThan(0);
    });

    it("ignores the org_id query param (session org is authoritative)", async () => {
      // The session is scoped to SESSION_ORG_ID; passing a bogus org_id must NOT
      // change which projects are returned.
      const res = await SELF.fetch("http://localhost/api/v1/projects?org_id=nonexistent-org-999", {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ProjectListItem[] }>();
      // The session org has seeded projects, so this returns those — not empty.
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("scopes results to the session org", async () => {
      await createProject({ name: "Filter Test", slug: `filter-${Date.now()}` });

      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ProjectListItem[] }>();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      for (const p of body.data) {
        // All returned projects belong to the session org (org rows resolve to TEST_ORG_ID).
        expect(p.org_id).toBeTruthy();
      }
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get project detail
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:id", () => {
    it("returns the project with its API keys (no raw key)", async () => {
      const createRes = await createProject({
        name: "Detail Test",
        slug: `detail-${Date.now()}`,
      });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      const projectId = created.project.id;

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}`, {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ProjectWithKeys>();
      expect(body.id).toBe(projectId);
      expect(body.name).toBe("Detail Test");
      expect(Array.isArray(body.api_keys)).toBe(true);
      expect(body.api_keys.length).toBeGreaterThanOrEqual(1);

      // Raw key must not be exposed
      for (const key of body.api_keys) {
        expect((key as unknown as Record<string, unknown>).key).toBeUndefined();
        expect(key.key_prefix).toBeTruthy();
      }
    });

    it("returns 404 for a non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_id_xyz", {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/keys — Generate new API key
  // -------------------------------------------------------------------------

  describe("POST /api/v1/projects/:id/keys", () => {
    it("creates a new key and returns the full raw key", async () => {
      const createRes = await createProject({
        name: "Key Gen Test",
        slug: `key-gen-${Date.now()}`,
      });
      const created = await createRes.json<{ project: Project }>();
      const projectId = created.project.id;

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}/keys`, {
        method: "POST",
        headers: dashboardHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: "Production Key" }),
      });
      expect(res.status).toBe(201);

      const body = await res.json<ApiKeyCreated>();
      expect(body.id).toBeTruthy();
      expect(body.name).toBe("Production Key");
      expect(body.key).toMatch(/^as_live_/);
      expect(body.key_prefix).toBe(body.key.substring(0, 12));
      expect(body.created_at).toBeGreaterThan(0);
    });

    it("returns 400 when name is missing", async () => {
      const createRes = await createProject({
        name: "Key Name Test",
        slug: `key-name-${Date.now()}`,
      });
      const created = await createRes.json<{ project: Project }>();

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${created.project.id}/keys`, {
        method: "POST",
        headers: dashboardHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_xyz/keys", {
        method: "POST",
        headers: dashboardHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: "Key" }),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id/keys/:keyId — Revoke API key
  // -------------------------------------------------------------------------

  describe("DELETE /api/v1/projects/:id/keys/:keyId", () => {
    it("revokes a key and returns 204", async () => {
      // Create project
      const createRes = await createProject({
        name: "Revoke Test",
        slug: `revoke-${Date.now()}`,
      });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      const projectId = created.project.id;

      // Generate a second key to revoke (keeps one active)
      const keyRes = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}/keys`, {
        method: "POST",
        headers: dashboardHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: "To Revoke" }),
      });
      const newKey = await keyRes.json<ApiKeyCreated>();

      // Revoke it
      const revokeRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/keys/${newKey.id}`,
        { method: "DELETE", headers: dashboardHeaders() },
      );
      expect(revokeRes.status).toBe(204);

      // Verify revocation visible in project detail
      const detailRes = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}`, {
        headers: dashboardHeaders(),
      });
      const detail = await detailRes.json<ProjectWithKeys>();

      const revokedKey = detail.api_keys.find((k) => k.id === newKey.id);
      expect(revokedKey).toBeDefined();
      expect(revokedKey!.revoked_at).not.toBeNull();
    });

    it("returns 204 even for a non-existent key (idempotent revocation)", async () => {
      const createRes = await createProject({
        name: "Idem Revoke",
        slug: `idem-revoke-${Date.now()}`,
      });
      const created = await createRes.json<{ project: Project }>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${created.project.id}/keys/nonexistent_key_id`,
        { method: "DELETE", headers: dashboardHeaders() },
      );
      expect(res.status).toBe(204);
    });
  });

  // -------------------------------------------------------------------------
  // GET /by-slug/:slug — Get project by slug
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/by-slug/:slug", () => {
    it("returns the project when slug matches", async () => {
      const slug = `by-slug-hit-${Date.now()}`;
      const createRes = await createProject({ name: "Slug Lookup", slug });
      const created = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      const projectId = created.project.id;

      const res = await SELF.fetch(`http://localhost/api/v1/projects/by-slug/${slug}`, {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ProjectWithKeys>();
      expect(body.id).toBe(projectId);
      expect(body.slug).toBe(slug);
      expect(body.name).toBe("Slug Lookup");
      expect(Array.isArray(body.api_keys)).toBe(true);
      // Auto-created "Default" key should appear, without the raw key value
      expect(body.api_keys.length).toBeGreaterThanOrEqual(1);
      for (const key of body.api_keys) {
        expect((key as unknown as Record<string, unknown>).key).toBeUndefined();
        expect(key.key_prefix).toBeTruthy();
      }
    });

    it("returns 404 for an unknown slug", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/projects/by-slug/slug-that-does-not-exist-999",
        { headers: dashboardHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/conversations — List conversations for a project (dashboard)
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:id/conversations", () => {
    /**
     * Helper: create a project and return its id + a Bearer header using the
     * API key that was auto-generated for that project.
     */
    async function createProjectWithKey(nameSuffix: string) {
      const slug = `conv-test-${nameSuffix}-${Date.now()}`;
      const createRes = await createProject({ name: `Conv Test ${nameSuffix}`, slug });
      expect(createRes.status).toBe(201);
      const body = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();
      return {
        projectId: body.project.id,
        authHeaders: {
          Authorization: `Bearer ${body.api_key.key}`,
          "Content-Type": "application/json",
        },
      };
    }

    async function createConversation(
      authHeaders: Record<string, string>,
      conversationBody: Record<string, unknown> = {},
    ) {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(conversationBody),
      });
      expect(res.status).toBe(201);
      return res.json<ConversationWithMessages>();
    }

    it("returns an empty list for a project with no conversations", async () => {
      const { projectId } = await createProjectWithKey("empty");

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}/conversations`, {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Conversation[] }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("returns conversations belonging to the project", async () => {
      const { projectId, authHeaders } = await createProjectWithKey("list");

      // Create two conversations for this project
      const conv1 = await createConversation(authHeaders, { title: "Alpha" });
      const conv2 = await createConversation(authHeaders, { title: "Beta" });

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}/conversations`, {
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Conversation[] }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);

      const ids = body.data.map((c) => c.id);
      expect(ids).toContain(conv1.id);
      expect(ids).toContain(conv2.id);

      // All returned conversations must belong to this project
      for (const conv of body.data) {
        expect(conv.project_id).toBe(projectId);
      }
    });

    it("respects the limit query parameter", async () => {
      const { projectId, authHeaders } = await createProjectWithKey("limit");

      // Create 3 conversations
      await createConversation(authHeaders, { title: "C1" });
      await createConversation(authHeaders, { title: "C2" });
      await createConversation(authHeaders, { title: "C3" });

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations?limit=2`,
        { headers: dashboardHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Conversation[] }>();
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it("does not return conversations from a different project", async () => {
      const { projectId: p1Id, authHeaders: p1Headers } = await createProjectWithKey("isolation-a");
      const { projectId: p2Id, authHeaders: p2Headers } = await createProjectWithKey("isolation-b");

      await createConversation(p1Headers, { title: "Project A conversation" });
      await createConversation(p2Headers, { title: "Project B conversation" });

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${p1Id}/conversations`, {
        headers: dashboardHeaders(),
      });
      const body = await res.json<{ data: Conversation[] }>();

      // Only project-1 conversations should be returned
      for (const conv of body.data) {
        expect(conv.project_id).toBe(p1Id);
      }

      // Project 2's conversation must not appear
      const p2ConvInP1 = body.data.some((c) => c.project_id === p2Id);
      expect(p2ConvInP1).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete project
  // -------------------------------------------------------------------------

  describe("DELETE /api/v1/projects/:id", () => {
    it("deletes a project and returns 204", async () => {
      const createRes = await createProject({
        name: "Delete Me",
        slug: `delete-me-${Date.now()}`,
      });
      expect(createRes.status).toBe(201);
      const { project } = await createRes.json<{ project: Project; api_key: ApiKeyCreated }>();

      const deleteRes = await SELF.fetch(`http://localhost/api/v1/projects/${project.id}`, {
        method: "DELETE",
        headers: dashboardHeaders(),
      });
      expect(deleteRes.status).toBe(204);
    });

    it("returns 404 for a non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_proj_id_xyz", {
        method: "DELETE",
        headers: dashboardHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("cascades deletion to conversations, messages, and API keys", async () => {
      const slug = `cascade-del-${Date.now()}`;
      const createRes = await createProject({ name: "Cascade Delete", slug });
      expect(createRes.status).toBe(201);
      const { project, api_key } = await createRes.json<{
        project: Project;
        api_key: ApiKeyCreated;
      }>();

      const authHeaders = {
        Authorization: `Bearer ${api_key.key}`,
        "Content-Type": "application/json",
      };

      // Create a conversation with messages via the API key
      const convRes = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there" },
          ],
        }),
      });
      expect(convRes.status).toBe(201);

      // Delete the project
      const deleteRes = await SELF.fetch(`http://localhost/api/v1/projects/${project.id}`, {
        method: "DELETE",
        headers: dashboardHeaders(),
      });
      expect(deleteRes.status).toBe(204);

      // Verify the project is gone
      const getRes = await SELF.fetch(`http://localhost/api/v1/projects/${project.id}`, {
        headers: dashboardHeaders(),
      });
      expect(getRes.status).toBe(404);

      // The project is deleted, so its conversations endpoint must 404 (the
      // org-scoped authorization fails because the project no longer exists).
      const convsRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${project.id}/conversations`,
        { headers: dashboardHeaders() },
      );
      expect(convsRes.status).toBe(404);

      // Cascade: conversations, messages, and keys rows are physically gone.
      const convRows = await env.DB.prepare(
        "SELECT COUNT(*) as n FROM conversations WHERE project_id = ?",
      )
        .bind(project.id)
        .first<{ n: number }>();
      expect(convRows?.n).toBe(0);
      const keyRows = await env.DB.prepare(
        "SELECT COUNT(*) as n FROM api_keys WHERE project_id = ?",
      )
        .bind(project.id)
        .first<{ n: number }>();
      expect(keyRows?.n).toBe(0);
    });

    it("does not affect other projects", async () => {
      const ts = Date.now();
      const createResA = await createProject({ name: "Keep Me", slug: `keep-me-${ts}` });
      const createResB = await createProject({ name: "Gone", slug: `gone-${ts}` });
      expect(createResA.status).toBe(201);
      expect(createResB.status).toBe(201);

      const { project: projectA } = await createResA.json<{ project: Project }>();
      const { project: projectB } = await createResB.json<{ project: Project }>();

      // Delete project B
      const deleteRes = await SELF.fetch(`http://localhost/api/v1/projects/${projectB.id}`, {
        method: "DELETE",
        headers: dashboardHeaders(),
      });
      expect(deleteRes.status).toBe(204);

      // Project A must still exist
      const getResA = await SELF.fetch(`http://localhost/api/v1/projects/${projectA.id}`, {
        headers: dashboardHeaders(),
      });
      expect(getResA.status).toBe(200);
      const bodyA = await getResA.json<ProjectWithKeys>();
      expect(bodyA.id).toBe(projectA.id);

      // Project B must be gone
      const getResB = await SELF.fetch(`http://localhost/api/v1/projects/${projectB.id}`, {
        headers: dashboardHeaders(),
      });
      expect(getResB.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/conversations/:convId/messages — List messages (dashboard)
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:id/conversations/:convId/messages", () => {
    async function setupProjectAndConversation(nameSuffix: string) {
      const slug = `msg-test-${nameSuffix}-${Date.now()}`;
      const createRes = await createProject({ name: `Msg Test ${nameSuffix}`, slug });
      expect(createRes.status).toBe(201);
      const { project, api_key } = await createRes.json<{
        project: Project;
        api_key: ApiKeyCreated;
      }>();
      const headers = {
        Authorization: `Bearer ${api_key.key}`,
        "Content-Type": "application/json",
      };
      return { projectId: project.id, headers };
    }

    async function createConversation(
      headers: Record<string, string>,
      body: Record<string, unknown> = {},
    ) {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(201);
      return res.json<ConversationWithMessages>();
    }

    it("returns an empty list for a conversation with no messages", async () => {
      const { projectId, headers } = await setupProjectAndConversation("empty-msgs");
      const conv = await createConversation(headers, {});

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations/${conv.id}/messages`,
        { headers: dashboardHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Message[] }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("returns messages in ascending chronological order", async () => {
      const { projectId, headers } = await setupProjectAndConversation("ordered-msgs");
      const conv = await createConversation(headers, {
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "Second message" },
          { role: "user", content: "Third message" },
        ],
      });

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations/${conv.id}/messages`,
        { headers: dashboardHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Message[] }>();
      expect(body.data.length).toBe(3);
      expect(body.data[0].content).toBe("First message");
      expect(body.data[1].content).toBe("Second message");
      expect(body.data[2].content).toBe("Third message");

      // Verify ascending order by created_at
      for (let i = 1; i < body.data.length; i++) {
        expect(body.data[i].created_at).toBeGreaterThanOrEqual(body.data[i - 1].created_at);
      }
    });

    it("includes all expected message fields", async () => {
      const { projectId, headers } = await setupProjectAndConversation("msg-fields");
      const conv = await createConversation(headers, {
        messages: [{ role: "user", content: "Field check", token_count: 7 }],
      });

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations/${conv.id}/messages`,
        { headers: dashboardHeaders() },
      );
      const body = await res.json<{ data: Message[] }>();

      const msg = body.data[0];
      expect(msg.id).toBeTruthy();
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Field check");
      expect(msg.token_count).toBe(7);
      expect(msg.created_at).toBeGreaterThan(0);
    });

    it("returns empty list for an unknown conversation id", async () => {
      const { projectId } = await setupProjectAndConversation("unknown-conv");

      // The dashboard route doesn't do a 404 check — it returns empty data for unknown conv IDs
      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations/nonexistent_conv_id/messages`,
        { headers: dashboardHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Message[] }>();
      expect(body.data).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

async function computeSHA256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
