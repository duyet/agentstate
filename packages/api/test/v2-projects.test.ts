import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface Project {
  project_id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: number;
  updated_at?: number;
  key_count?: number;
}

interface ProjectWithKeys extends Project {
  api_keys: ApiKey[];
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key?: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

interface CreateProjectResponse {
  project: Project;
  api_key: ApiKey;
}

interface ListResponse<T> {
  data: T[];
  pagination: { limit: number; next_cursor: string | null; total: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProjectV2(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/api/v2/projects", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("V2 Projects", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create project
  // -------------------------------------------------------------------------

  describe("POST /api/v2/projects", () => {
    it("creates a project with default values", async () => {
      const res = await createProjectV2({
        name: "Test Project",
        slug: "test-project",
      });
      expect(res.status).toBe(201);

      const body = await res.json<CreateProjectResponse>();
      expect(body.project.project_id).toBeTruthy();
      expect(body.project.org_id).toBeTruthy();
      expect(body.project.name).toBe("Test Project");
      expect(body.project.slug).toBe("test-project");
      expect(body.project.created_at).toBeTruthy();
      // V2: includes updated_at
      expect(body.project.updated_at).toBeTruthy();
      expect(body.api_key.key).toBeTruthy();
      expect(body.api_key.name).toBe("Default");
    });

    it("creates a project with custom org_id", async () => {
      const res = await createProjectV2({
        name: "Custom Org Project",
        slug: "custom-org-project",
        org_id: "custom-org-123",
      });
      expect(res.status).toBe(201);

      const body = await res.json<CreateProjectResponse>();
      expect(body.project.name).toBe("Custom Org Project");
      expect(body.project.org_id).toBeTruthy();
    });

    it("returns 409 for duplicate slug", async () => {
      const res1 = await createProjectV2({
        name: "First",
        slug: "duplicate-slug",
      });
      expect(res1.status).toBe(201);

      const res2 = await createProjectV2({
        name: "Second",
        slug: "duplicate-slug",
      });
      expect(res2.status).toBe(409);

      const body = await res2.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid slug format", async () => {
      const res = await createProjectV2({
        name: "Test",
        slug: "Invalid_Slug",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await createProjectV2({ name: "Test" });
      expect(res.status).toBe(400);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await createProjectV2({
        name: "Test",
        slug: `test-${Date.now()}`,
      });
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List projects
  // -------------------------------------------------------------------------

  describe("GET /api/v2/projects", () => {
    it("lists projects for default org", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Project>>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(typeof body.pagination.limit).toBe("number");
      // V2: includes total count
      expect(typeof body.pagination.total).toBe("number");
      // V2: uses project_id instead of id
      if (body.data.length > 0) {
        expect(body.data[0]).toHaveProperty("project_id");
        expect(body.data[0]).not.toHaveProperty("id");
      }
    });

    it("filters by org_id", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects?org_id=default", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Project>>();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns 400 for negative cursor", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects?cursor=-1234567890", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 400 for non-numeric cursor", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects?cursor=not-a-number", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("respects limit parameter", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects?limit=5", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Project>>();
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get project by ID
  // -------------------------------------------------------------------------

  describe("GET /api/v2/projects/:id", () => {
    it("returns project with API keys", async () => {
      const res = await SELF.fetch(`http://localhost/api/v2/projects/${TEST_PROJECT_ID}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ProjectWithKeys>();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.name).toBeTruthy();
      expect(Array.isArray(body.api_keys)).toBe(true);
    });

    it("returns 404 for non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects/does_not_exist_id", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("V2: uses project_id instead of id", async () => {
      const res = await SELF.fetch(`http://localhost/api/v2/projects/${TEST_PROJECT_ID}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Project>();
      expect(body).toHaveProperty("project_id");
      expect(body).not.toHaveProperty("id");
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /:id — Update project
  // -------------------------------------------------------------------------

  describe("PATCH /api/v2/projects/:id", () => {
    it("updates project name", async () => {
      const createRes = await createProjectV2({
        name: "Original Name",
        slug: `update-test-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();

      const res = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: "Updated Name" }),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ProjectWithKeys>();
      expect(body.name).toBe("Updated Name");
      // V2: includes updated_at
      expect(body.updated_at).toBeTruthy();
    });

    it("returns 404 for non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects/nonexistent_id", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: "New Name" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 400 for empty name", async () => {
      const createRes = await createProjectV2({
        name: "Test",
        slug: `test-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();

      const res = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: "" }),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete project
  // -------------------------------------------------------------------------

  describe("DELETE /api/v2/projects/:id", () => {
    it("deletes project and returns 204", async () => {
      const createRes = await createProjectV2({
        name: "Delete Me",
        slug: `delete-me-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();

      const deleteRes = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const getRes = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}`, {
        headers: authHeaders(),
      });
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects/nonexistent_id", {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/keys — Create API key
  // -------------------------------------------------------------------------

  describe("POST /api/v2/projects/:id/keys", () => {
    it("creates a new API key", async () => {
      const createRes = await createProjectV2({
        name: "Key Test",
        slug: `key-test-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();

      const res = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}/keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: "Test Key" }),
      });
      expect(res.status).toBe(201);

      const body = await res.json<ApiKey>();
      expect(body.name).toBe("Test Key");
      expect(body.key).toBeTruthy();
      expect(body.key_prefix).toBeTruthy();
    });

    it("returns 404 for non-existent project", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/projects/nonexistent_id/keys", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: "Test Key" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 400 for missing name", async () => {
      const createRes = await createProjectV2({
        name: "Key Test",
        slug: `key-test-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();

      const res = await SELF.fetch(`http://localhost/api/v2/projects/${created.project.project_id}/keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id/keys/:keyId — Revoke API key
  // -------------------------------------------------------------------------

  describe("DELETE /api/v2/projects/:id/keys/:keyId", () => {
    it("revokes an API key", async () => {
      const createRes = await createProjectV2({
        name: "Revoke Test",
        slug: `revoke-test-${Date.now()}`,
      });
      const created = await createRes.json<CreateProjectResponse>();
      const keyId = created.api_key.id;

      const deleteRes = await SELF.fetch(
        `http://localhost/api/v2/projects/${created.project.project_id}/keys/${keyId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      expect(deleteRes.status).toBe(204);
    });
  });

  // -------------------------------------------------------------------------
  // V1 deprecation headers
  // -------------------------------------------------------------------------

  describe("V1 Deprecation Headers", () => {
    it("adds deprecation headers to V1 projects endpoints", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
      expect(res.headers.get("Sunset")).toBe("2026-12-31");
      expect(res.headers.get("Link")).toContain("deprecation");
    });
  });
});
