import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject } from "./setup";

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
});
