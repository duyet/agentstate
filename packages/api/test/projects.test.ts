import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject } from "./setup";

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(body: Record<string, unknown>) {
  return SELF.fetch("http://localhost/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

    it("allows the same slug in different orgs", async () => {
      const slug = `shared-slug-${Date.now()}`;
      const first = await createProject({ name: "Org A App", slug, org_id: `org-a-${Date.now()}` });
      expect(first.status).toBe(201);

      const second = await createProject({ name: "Org B App", slug, org_id: `org-b-${Date.now()}` });
      expect(second.status).toBe(201);
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

    it("returns 400 for invalid JSON body", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List projects
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects", () => {
    it("lists projects for the default org", async () => {
      // Ensure at least one exists
      await createProject({ name: "List Test", slug: `list-test-${Date.now()}` });

      const res = await SELF.fetch("http://localhost/api/v1/projects");
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

      const res = await SELF.fetch("http://localhost/api/v1/projects");
      const body = await res.json<{ data: ProjectListItem[] }>();

      const found = body.data.find((p) => p.id === projectId);
      expect(found).toBeDefined();
      // Should have at least the auto-created "Default" key
      expect(found!.key_count).toBeGreaterThanOrEqual(1);
    });

    it("returns empty list for an org with no projects", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/projects?org_id=nonexistent-org-999",
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ProjectListItem[] }>();
      expect(body.data).toEqual([]);
    });

    it("filters by org_id query param", async () => {
      const orgId = `filter-org-${Date.now()}`;
      await createProject({ name: "Filter Test", slug: `filter-${Date.now()}`, org_id: orgId });

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects?org_id=${encodeURIComponent(orgId)}`,
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ProjectListItem[] }>();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      for (const p of body.data) {
        // All returned projects should belong to the queried org
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

      const res = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}`);
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
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_id_xyz");
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
        headers: { "Content-Type": "application/json" },
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

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${created.project.id}/keys`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_xyz/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "To Revoke" }),
      });
      const newKey = await keyRes.json<ApiKeyCreated>();

      // Revoke it
      const revokeRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/keys/${newKey.id}`,
        { method: "DELETE" },
      );
      expect(revokeRes.status).toBe(204);

      // Verify revocation visible in project detail
      const detailRes = await SELF.fetch(`http://localhost/api/v1/projects/${projectId}`);
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
        { method: "DELETE" },
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

      const res = await SELF.fetch(`http://localhost/api/v1/projects/by-slug/${slug}`);
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

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations`,
      );
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

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${projectId}/conversations`,
      );
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

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${p1Id}/conversations`,
      );
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
      });
      expect(deleteRes.status).toBe(204);
    });

    it("returns 404 for a non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/nonexistent_proj_id_xyz", {
        method: "DELETE",
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
      });
      expect(deleteRes.status).toBe(204);

      // Verify the project is gone
      const getRes = await SELF.fetch(`http://localhost/api/v1/projects/${project.id}`);
      expect(getRes.status).toBe(404);

      // Verify conversations listing returns empty (project no longer exists)
      const convsRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${project.id}/conversations`,
      );
      const convsBody = await convsRes.json<{ data: Conversation[] }>();
      expect(convsBody.data).toEqual([]);
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
      });
      expect(deleteRes.status).toBe(204);

      // Project A must still exist
      const getResA = await SELF.fetch(`http://localhost/api/v1/projects/${projectA.id}`);
      expect(getResA.status).toBe(200);
      const bodyA = await getResA.json<ProjectWithKeys>();
      expect(bodyA.id).toBe(projectA.id);

      // Project B must be gone
      const getResB = await SELF.fetch(`http://localhost/api/v1/projects/${projectB.id}`);
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
      );
      expect(res.status).toBe(200);

      const body = await res.json<{ data: Message[] }>();
      expect(body.data).toEqual([]);
    });
  });
});
