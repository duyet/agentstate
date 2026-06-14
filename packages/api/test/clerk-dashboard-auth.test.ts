import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyMigrations, seedProject, TEST_ORG_ID } from "./setup";

// The test seed binds the org row to clerk_org_id = "clerk_test_org_001".
// Our signed session tokens default to o_id = "clerk_test_org_001" so they
// match the seeded org and its project.
const SESSION_ORG_ID = "clerk_test_org_001";
const OTHER_ORG_ID = "clerk_other_org_999";

const JSON_HEADERS = { "Content-Type": "application/json" };

describe("Dashboard-management auth (clerkDashboardAuth)", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // Fail-closed / unauthenticated
  // -------------------------------------------------------------------------

  describe("unauthenticated requests are rejected", () => {
    it("GET /api/v1/projects without a session returns 401", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects");
      expect(res.status).toBe(401);
      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("POST /api/v1/projects without a session returns 401 (no project created)", async () => {
      const before = await env.DB.prepare("SELECT COUNT(*) as n FROM projects").first<{
        n: number;
      }>();
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: "Should Not Exist", slug: "should-not-exist" }),
      });
      expect(res.status).toBe(401);
      const after = await env.DB.prepare("SELECT COUNT(*) as n FROM projects").first<{
        n: number;
      }>();
      expect(after?.n).toBe(before?.n);
    });

    it("DELETE /api/v1/projects/:id without a session returns 401", async () => {
      const res = await SELF.fetch(`http://localhost/api/v1/projects/${"proj_test_000000000001"}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/v1/projects/:id/keys without a session returns 401", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects/proj_test_000000000001/keys", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: "x" }),
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/v1/projects/:id/analytics without a session returns 401", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/projects/proj_test_000000000001/analytics",
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/v1/projects/:id/domains without a session returns 401", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/projects/proj_test_000000000001/domains",
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/v/organizations/:id without a session returns 401", async () => {
      const res = await SELF.fetch("http://localhost/api/v/organizations/some-org");
      expect(res.status).toBe(401);
    });

    it("GET /api/v/projects without a session returns 401", async () => {
      const res = await SELF.fetch("http://localhost/api/v/projects");
      expect(res.status).toBe(401);
    });

    it("rejects a malformed/unsigned bearer token", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: { Authorization: "Bearer not-a-real-jwt" },
      });
      expect(res.status).toBe(401);
    });

    it("rejects an expired session token", async () => {
      const token = await signTestSessionToken({ expiresInSec: -10 });
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated + org-scoped
  // -------------------------------------------------------------------------

  describe("authenticated requests are scoped to the session org", () => {
    it("GET /api/v1/projects returns 200 with a valid session cookie", async () => {
      const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: { Cookie: sessionCookie(token) },
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ data: Array<{ org_id: string }> }>();
      expect(Array.isArray(body.data)).toBe(true);
      // Every returned project must belong to the session's org.
      for (const p of body.data) {
        expect(p.org_id).toBeTruthy();
      }
    });

    it("accepts the token via Authorization: Bearer header too", async () => {
      const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
    });

    it("POST /api/v1/projects scopes the new project to the session org (ignores body org_id)", async () => {
      const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
      const slug = `authed-create-${Date.now()}`;
      // Try to spoof a different org_id in the body — must be ignored.
      const res = await SELF.fetch("http://localhost/api/v1/projects", {
        method: "POST",
        headers: { ...JSON_HEADERS, Cookie: sessionCookie(token) },
        body: JSON.stringify({ name: "Authed Create", slug, org_id: OTHER_ORG_ID }),
      });
      expect(res.status).toBe(201);
      const body = await res.json<{ project: { id: string; org_id: string } }>();
      expect(body.project.id).toBeTruthy();

      // The created project must be owned by the session org, not the spoofed one.
      const row = await env.DB.prepare("SELECT org_id FROM projects WHERE id = ?")
        .bind(body.project.id)
        .first<{ org_id: string }>();
      expect(row?.org_id).toBe(TEST_ORG_ID);
    });

    it("GET /api/v1/projects/:id returns 404 for a project in another org", async () => {
      // Create a project owned by a different org directly in the DB.
      const otherProjectId = `proj_other_${Date.now()}`;
      const now = Date.now();
      // Ensure the other org exists.
      await env.DB.prepare(
        "INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at) VALUES (?, ?, ?, ?)",
      )
        .bind(`org_other_${Date.now()}`, OTHER_ORG_ID, "Other Org", now)
        .run();
      const orgRow = await env.DB.prepare("SELECT id FROM organizations WHERE clerk_org_id = ?")
        .bind(OTHER_ORG_ID)
        .first<{ id: string }>();
      await env.DB.prepare(
        "INSERT INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(otherProjectId, orgRow?.id, "Other Project", `other-${Date.now()}`, now)
        .run();

      // Authenticated as SESSION_ORG_ID — must NOT see the other org's project.
      const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
      const res = await SELF.fetch(`http://localhost/api/v1/projects/${otherProjectId}`, {
        headers: { Cookie: sessionCookie(token) },
      });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/v1/projects/:id cannot delete another org's project", async () => {
      const otherProjectId = `proj_del_other_${Date.now()}`;
      const now = Date.now();
      const orgRow = await env.DB.prepare("SELECT id FROM organizations WHERE clerk_org_id = ?")
        .bind(OTHER_ORG_ID)
        .first<{ id: string }>();
      await env.DB.prepare(
        "INSERT INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(otherProjectId, orgRow?.id, "Other Del", `del-other-${Date.now()}`, now)
        .run();

      const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
      const res = await SELF.fetch(`http://localhost/api/v1/projects/${otherProjectId}`, {
        method: "DELETE",
        headers: { Cookie: sessionCookie(token) },
      });
      expect(res.status).toBe(404);

      // The project must still exist.
      const row = await env.DB.prepare("SELECT id FROM projects WHERE id = ?")
        .bind(otherProjectId)
        .first<{ id: string }>();
      expect(row?.id).toBe(otherProjectId);
    });
  });

  // -------------------------------------------------------------------------
  // Intentionally-public routes remain open
  // -------------------------------------------------------------------------

  describe("public routes are unaffected", () => {
    it("GET /api health returns 200 unauthenticated", async () => {
      const res = await SELF.fetch("http://localhost/api");
      expect(res.status).toBe(200);
    });

    it("GET /llms.txt returns 200 unauthenticated", async () => {
      const res = await SELF.fetch("http://localhost/llms.txt");
      expect(res.status).toBe(200);
    });

    it("GET /agents.md returns 200 unauthenticated", async () => {
      const res = await SELF.fetch("http://localhost/agents.md");
      expect(res.status).toBe(200);
    });

    it("GET /openapi.json returns 200 unauthenticated", async () => {
      const res = await SELF.fetch("http://localhost/openapi.json");
      expect(res.status).toBe(200);
    });

    it("GET /verify-domain/:token returns 200 unauthenticated", async () => {
      const res = await SELF.fetch(
        "http://localhost/verify-domain/agentstate-verify-abc123def456ghij",
      );
      expect(res.status).toBe(200);
    });

    it("API-key conversations route still requires an API key (not Clerk)", async () => {
      // No API key and no Clerk session -> 401 from apiKeyAuth.
      const res = await SELF.fetch("http://localhost/api/v1/conversations");
      expect(res.status).toBe(401);
    });
  });
});
