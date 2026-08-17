import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyMigrations, seedProject, TEST_PROJECT_ID } from "./setup";

// Dashboard domain routes require a verified Clerk session. The seeded
// project lives under clerk_org_id = "clerk_test_org_001".
const SESSION_ORG_ID = "clerk_test_org_001";
const OTHER_ORG_ID = "clerk_other_org_999";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function dashboardHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await signTestSessionToken({ orgId: SESSION_ORG_ID });
  return { Cookie: sessionCookie(token), ...extra };
}

function domainsUrl(projectId: string, suffix = ""): string {
  return `http://localhost/api/v1/projects/${projectId}/domains${suffix}`;
}

async function createDomain(projectId: string, domain: string): Promise<Response> {
  return SELF.fetch(domainsUrl(projectId), {
    method: "POST",
    headers: await dashboardHeaders(JSON_HEADERS),
    body: JSON.stringify({ domain }),
  });
}

function uniqueDomain(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.example.com`;
}

interface CreatedDomain {
  id: string;
  domain: string;
  verification_instructions: {
    dns_txt: { name: string; value: string };
    http_file: { url: string; content: string };
    meta_tag: { name: string; content: string };
  };
}

interface DomainRow {
  id: string;
  domain: string;
}

interface VerificationResult {
  id: string;
  domain: string;
  verification_status: "pending" | "verified" | "failed";
  verified_at: number | null;
}

interface ErrorBody {
  error: { code: string; message: string };
}

describe("Custom domains (/api/v1/projects/:projectId/domains)", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // Unauthenticated
  // -------------------------------------------------------------------------

  describe("unauthenticated requests are rejected", () => {
    it("GET list without a session returns 401", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID));
      expect(res.status).toBe(401);
      expect((await res.json<ErrorBody>()).error.code).toBe("UNAUTHORIZED");
    });

    it("POST create without a session returns 401", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID), {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ domain: uniqueDomain("unauth") }),
      });
      expect(res.status).toBe(401);
    });

    it("GET one without a session returns 401", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_missing"));
      expect(res.status).toBe(401);
    });

    it("DELETE without a session returns 401", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_missing"), {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });

    it("POST verify without a session returns 401", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_missing/verify"), {
        method: "POST",
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:projectId/domains
  // -------------------------------------------------------------------------

  describe("POST /api/v1/projects/:projectId/domains", () => {
    it("creates a domain and returns verification instructions", async () => {
      const domain = uniqueDomain("create");
      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);

      const body = await res.json<CreatedDomain>();
      expect(body.id).toBeTruthy();
      expect(body.domain).toBe(domain);
      expect(body.verification_instructions.dns_txt.name).toBe(`_agentstate.${domain}`);
      expect(body.verification_instructions.dns_txt.value).toMatch(/^agentstate-verify-/);
      expect(body.verification_instructions.http_file.url).toContain(domain);
      expect(body.verification_instructions.meta_tag.name).toBe("agentstate-verification");
    });

    it("normalizes mixed-case domains", async () => {
      const label = uniqueDomain("Case").split(".")[0];
      const domain = `${label}.Example.COM`;
      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);
      expect((await res.json<CreatedDomain>()).domain).toBe(domain.toLowerCase());
    });

    it("returns 400 for an invalid domain", async () => {
      const res = await createDomain(TEST_PROJECT_ID, "not a domain");
      expect(res.status).toBe(400);
      expect((await res.json<ErrorBody>()).error.code).toBe("INVALID_DOMAIN");
    });

    it("returns 400 for an empty domain", async () => {
      const res = await createDomain(TEST_PROJECT_ID, "");
      expect(res.status).toBe(400);
    });

    it("returns 409 when the domain already exists", async () => {
      const domain = uniqueDomain("dup");
      const first = await createDomain(TEST_PROJECT_ID, domain);
      expect(first.status).toBe(201);

      const second = await createDomain(TEST_PROJECT_ID, domain);
      expect(second.status).toBe(409);
      expect((await second.json<ErrorBody>()).error.code).toBe("DOMAIN_EXISTS");
    });

    it("returns 404 for a project in another org", async () => {
      const otherProjectId = await insertOtherOrgProject("create");
      const res = await createDomain(otherProjectId, uniqueDomain("other-create"));
      expect(res.status).toBe(404);
      expect((await res.json<ErrorBody>()).error.code).toBe("NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // GET /:projectId/domains
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:projectId/domains", () => {
    it("lists domains for the project (regression: not the doubled mount path)", async () => {
      const domain = uniqueDomain("list");
      const created = await createDomain(TEST_PROJECT_ID, domain);
      expect(created.status).toBe(201);
      const { id } = await created.json<CreatedDomain>();

      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID), {
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ data: DomainRow[] }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((row) => row.id === id && row.domain === domain)).toBe(true);
    });

    it("returns 404 for a project in another org", async () => {
      const otherProjectId = await insertOtherOrgProject("list");
      const res = await SELF.fetch(domainsUrl(otherProjectId), {
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:projectId/domains/:domainId
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:projectId/domains/:domainId", () => {
    it("returns a single domain", async () => {
      const domain = uniqueDomain("get");
      const created = await createDomain(TEST_PROJECT_ID, domain);
      expect(created.status).toBe(201);
      const { id } = await created.json<CreatedDomain>();

      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, `/${id}`), {
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<DomainRow>();
      expect(body.id).toBe(id);
      expect(body.domain).toBe(domain);
    });

    it("returns 404 for a missing domain", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_does_not_exist"), {
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(404);
      expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // POST /:projectId/domains/:domainId/verify
  // -------------------------------------------------------------------------

  describe("POST /api/v1/projects/:projectId/domains/:domainId/verify", () => {
    it("runs a verification check on a pending domain", async () => {
      // Single-label host fails the outbound-target guard immediately, so this
      // exercises the mounted verify handler without waiting on DNS/HTTP.
      const domain = `localhost-${Date.now()}`;
      const created = await createDomain(TEST_PROJECT_ID, domain);
      expect(created.status).toBe(201);
      const { id } = await created.json<CreatedDomain>();

      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, `/${id}/verify`), {
        method: "POST",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<VerificationResult>();
      expect(body.id).toBe(id);
      expect(body.domain).toBe(domain);
      expect(["pending", "verified", "failed"]).toContain(body.verification_status);
    });

    it("returns the stored result when the domain is already verified", async () => {
      const domain = uniqueDomain("already-verified");
      const created = await createDomain(TEST_PROJECT_ID, domain);
      expect(created.status).toBe(201);
      const { id } = await created.json<CreatedDomain>();

      const verifiedAt = Date.now();
      await env.DB.prepare(
        "UPDATE custom_domains SET verification_status = ?, verified_at = ? WHERE id = ?",
      )
        .bind("verified", verifiedAt, id)
        .run();

      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, `/${id}/verify`), {
        method: "POST",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<VerificationResult>();
      expect(body.verification_status).toBe("verified");
      expect(body.verified_at).toBe(verifiedAt);
    });

    it("returns 404 for a missing domain", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_does_not_exist/verify"), {
        method: "POST",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(404);
      expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:projectId/domains/:domainId
  // -------------------------------------------------------------------------

  describe("DELETE /api/v1/projects/:projectId/domains/:domainId", () => {
    it("deletes a domain", async () => {
      const domain = uniqueDomain("delete");
      const created = await createDomain(TEST_PROJECT_ID, domain);
      expect(created.status).toBe(201);
      const { id } = await created.json<CreatedDomain>();

      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, `/${id}`), {
        method: "DELETE",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(204);

      const missing = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, `/${id}`), {
        headers: await dashboardHeaders(),
      });
      expect(missing.status).toBe(404);

      const row = await env.DB.prepare("SELECT id FROM custom_domains WHERE id = ?")
        .bind(id)
        .first<{ id: string }>();
      expect(row).toBeNull();
    });

    it("returns 404 for a missing domain", async () => {
      const res = await SELF.fetch(domainsUrl(TEST_PROJECT_ID, "/dom_does_not_exist"), {
        method: "DELETE",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(404);
      expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_NOT_FOUND");
    });

    it("cannot delete a domain on another org's project", async () => {
      const otherProjectId = await insertOtherOrgProject("delete");
      const now = Date.now();
      const domainId = `dom_other_${now}`;
      await env.DB.prepare(
        `INSERT INTO custom_domains
          (id, project_id, domain, verification_token, verification_status, verified_at, ssl_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', NULL, 0, ?, ?)`,
      )
        .bind(domainId, otherProjectId, uniqueDomain("other-del"), "agentstate-verify-testdelete000", now, now)
        .run();

      const res = await SELF.fetch(domainsUrl(otherProjectId, `/${domainId}`), {
        method: "DELETE",
        headers: await dashboardHeaders(),
      });
      expect(res.status).toBe(404);

      const row = await env.DB.prepare("SELECT id FROM custom_domains WHERE id = ?")
        .bind(domainId)
        .first<{ id: string }>();
      expect(row?.id).toBe(domainId);
    });
  });
});

async function insertOtherOrgProject(label: string): Promise<string> {
  const now = Date.now();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO organizations (id, clerk_org_id, name, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(`org_other_${label}`, OTHER_ORG_ID, "Other Org", now)
    .run();
  const orgRow = await env.DB.prepare("SELECT id FROM organizations WHERE clerk_org_id = ?")
    .bind(OTHER_ORG_ID)
    .first<{ id: string }>();
  const projectId = `proj_other_${label}_${now}`;
  await env.DB.prepare(
    "INSERT INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(projectId, orgRow?.id, `Other ${label}`, `other-${label}-${now}`, now)
    .run();
  return projectId;
}
