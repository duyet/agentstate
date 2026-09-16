import { env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { type CustomDomain, customDomains } from "../src/db/schema";
import { createDomain as createDomainService } from "../src/services/domains";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyMigrations, seedProject, TEST_PROJECT_ID } from "./setup";

// Dashboard domain routes require a verified Clerk session. The seeded
// project lives under clerk_org_id = "clerk_test_org_001".
const SESSION_ORG_ID = "clerk_test_org_001";
const OTHER_ORG_ID = "clerk_other_org_999";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function dashboardHeaders(
  extra: Record<string, string> = {},
  orgId = SESSION_ORG_ID,
): Promise<Record<string, string>> {
  const token = await signTestSessionToken({ orgId });
  return { Cookie: sessionCookie(token), ...extra };
}

function domainsUrl(projectId: string, suffix = ""): string {
  return `http://localhost/api/v1/projects/${projectId}/domains${suffix}`;
}

async function createDomain(projectId: string, domain: string, orgId = SESSION_ORG_ID): Promise<Response> {
  return SELF.fetch(domainsUrl(projectId), {
    method: "POST",
    headers: await dashboardHeaders(JSON_HEADERS, orgId),
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

// Reclaim window: a pending/failed claim older than this is stale and may be
// taken over by a new project. Must match the service constant.
const RECLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function insertDomainRow(row: {
  id: string;
  projectId: string;
  domain: string;
  verificationStatus: "pending" | "verified" | "failed";
  verifiedAt: number | null;
  createdAt: number;
  updatedAt?: number;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO custom_domains
      (id, project_id, domain, verification_token, verification_status, verified_at, ssl_enabled, created_at, updated_at)
     VALUES (?, ?, ?, 'agentstate-verify-testrow000000000', ?, ?, 0, ?, ?)`,
  )
    .bind(
      row.id,
      row.projectId,
      row.domain,
      row.verificationStatus,
      row.verifiedAt,
      row.createdAt,
      row.updatedAt ?? row.createdAt,
    )
    .run();
}

async function getDomainRow(domain: string): Promise<CustomDomain | null> {
  const row = await serviceDb().select().from(customDomains)
    .where(eq(customDomains.domain, domain)).get();
  return row ?? null;
}

// Drizzle handle over the same D1 binding the worker uses, for calling the
// service directly (boundary tests and concurrent adds).
function serviceDb() {
  return drizzle(env.DB);
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

  // -------------------------------------------------------------------------
  // Regression: atomic domain claim with stale reclamation
  //
  // createDomain must be a single atomic insert/onConflictDoUpdate that:
  // - claims an absent domain OR reclaims an existing row that is
  //   pending/failed, unverified, and older than the 7-day reclaim window
  //   (same-project reclaims included)
  // - leaves an unexpired same-project claim as 409 DOMAIN_EXISTS
  // - answers every different-project conflict with the same neutral 409
  //   DOMAIN_UNAVAILABLE, never disclosing owner/id/token/status
  // - never reclaims a verified row (or any row with historical verifiedAt)
  // - does not extend the reclaim deadline on conflicting retries
  // -------------------------------------------------------------------------

  describe("domain claim atomicity and stale reclaim", () => {
    const STALE_AGE_MS = RECLAIM_WINDOW_MS + 60 * 60 * 1000; // 7 days + 1h
    const FRESH_AGE_MS = RECLAIM_WINDOW_MS - 60 * 60 * 1000; // 7 days - 1h

    let otherProjectId: string;

    beforeAll(async () => {
      otherProjectId = await insertOtherOrgProject("reclaim");
    });

    it("reclaims a stale pending domain from the same project with a new claim", async () => {
      const domain = uniqueDomain("stale-pending");
      const createdAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_stale_pending_old",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt,
      });

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);

      const body = await res.json<CreatedDomain>();
      expect(body.id).not.toBe("dom_stale_pending_old");
      expect(body.domain).toBe(domain);
      expect(body.verification_instructions.dns_txt.value).toMatch(/^agentstate-verify-/);

      const row = await getDomainRow(domain);
      expect(row).toMatchObject({
        id: body.id,
        projectId: TEST_PROJECT_ID,
        verificationStatus: "pending",
        verifiedAt: null,
        sslEnabled: false,
      });
      expect(row!.verificationToken).toBe(body.verification_instructions.dns_txt.value);
      expect(row!.verificationToken).not.toBe("agentstate-verify-testrow000000000");
      expect(row!.createdAt).toBeGreaterThanOrEqual(Date.now() - 60_000);
      expect(row!.updatedAt).toBe(row!.createdAt);
      expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM custom_domains WHERE domain = ?")
        .bind(domain).first<{ n: number }>()).toEqual({ n: 1 });
    });

    it("reclaims a stale failed domain from the same project", async () => {
      const domain = uniqueDomain("stale-failed");
      const createdAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_stale_failed_old",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "failed",
        verifiedAt: null,
        createdAt,
      });

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);
      const body = await res.json<CreatedDomain>();
      expect(body.id).not.toBe("dom_stale_failed_old");

      const row = await getDomainRow(domain);
      expect(row).toMatchObject({
        id: body.id,
        projectId: TEST_PROJECT_ID,
        verificationStatus: "pending",
        verifiedAt: null,
        sslEnabled: false,
      });
    });

    it("reclaims a stale pending domain from another organization", async () => {
      const domain = uniqueDomain("stale-cross-project");
      const createdAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_stale_sameorg_old",
        projectId: otherProjectId,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt,
      });

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);
      const body = await res.json<CreatedDomain>();
      expect(body.id).not.toBe("dom_stale_sameorg_old");

      const row = await getDomainRow(domain);
      expect(row?.projectId).toBe(TEST_PROJECT_ID);
    });

    it("returns a neutral 409 for a different-project conflict regardless of status", async () => {
      const cases: Array<{
        label: string;
        status: "pending" | "verified" | "failed";
        verifiedAt: number | null;
        ageMs: number;
      }> = [
        { label: "unexpired-pending", status: "pending", verifiedAt: null, ageMs: FRESH_AGE_MS },
        { label: "unexpired-failed", status: "failed", verifiedAt: null, ageMs: FRESH_AGE_MS },
        { label: "expired-verified", status: "verified", verifiedAt: Date.now(), ageMs: STALE_AGE_MS },
        { label: "freshly-verified", status: "verified", verifiedAt: Date.now(), ageMs: 0 },
      ];

      for (const c of cases) {
        const domain = uniqueDomain(`conflict-${c.label}`);
        await insertDomainRow({
          id: `dom_conflict_${c.label}`,
          projectId: otherProjectId,
          domain,
          verificationStatus: c.status,
          verifiedAt: c.verifiedAt,
          createdAt: Date.now() - c.ageMs,
        });

        const res = await createDomain(TEST_PROJECT_ID, domain);
        expect(res.status, c.label).toBe(409);

        const body = await res.json<ErrorBody>();
        expect(body.error.code, c.label).toBe("DOMAIN_UNAVAILABLE");
        expect(body.error.message, c.label).toBe(
          "Domain cannot be added. Please try again later.",
        );

        const raw = JSON.stringify(body);
        expect(raw).not.toContain("dom_conflict_");
        expect(raw).not.toContain(otherProjectId);
        expect(raw).not.toContain("agentstate-verify-");
        expect(raw).not.toMatch(/"status"\s*:/);

        // The conflicting row must be untouched.
        const row = await getDomainRow(domain);
        expect(row?.id).toBe(`dom_conflict_${c.label}`);
        expect(row?.projectId).toBe(otherProjectId);
      }
    });

    it("gives identical neutral responses across tenants for the same conflict", async () => {
      const domain = uniqueDomain("cross-tenant");
      await insertDomainRow({
        id: "dom_cross_tenant_holder",
        projectId: otherProjectId,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt: Date.now() - FRESH_AGE_MS,
      });

      const holder = await createDomain(TEST_PROJECT_ID, domain);
      expect(holder.status).toBe(409);
      const holderBody = await holder.json<ErrorBody>();
      expect(holderBody.error).toEqual({
        code: "DOMAIN_UNAVAILABLE",
        message: "Domain cannot be added. Please try again later.",
      });

      const thirdProjectId = await insertOtherOrgProject("third-tenant");
      const challenger = await createDomain(thirdProjectId, domain, OTHER_ORG_ID);
      expect(challenger.status).toBe(409);
      const challengerBody = await challenger.json<ErrorBody>();
      expect(challengerBody.error).toEqual(holderBody.error);
    });

    it("does not extend the reclaim deadline when retries hit an unexpired claim", async () => {
      const domain = uniqueDomain("retry-deadline");
      const originalCreatedAt = Date.now() - FRESH_AGE_MS;
      await insertDomainRow({
        id: "dom_retry_deadline",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt: originalCreatedAt,
        updatedAt: Date.now() - 60_000,
      });

      // Repeated conflicting attempts must leave createdAt (the reclaim
      // deadline anchor) untouched.
      for (let i = 0; i < 3; i++) {
        const res = await createDomain(TEST_PROJECT_ID, domain);
        expect(res.status).toBe(409);
        expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_EXISTS");
      }

      const row = await getDomainRow(domain);
      expect(row?.createdAt).toBe(originalCreatedAt);
    });

    it("reclaims after the deadline passes once retries have stopped", async () => {
      const domain = uniqueDomain("retry-then-reclaim");
      const originalCreatedAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_retry_then_reclaim",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt: originalCreatedAt,
        updatedAt: Date.now() - 60_000,
      });

      // Recent verification retries must not renew the claim's creation deadline.
      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);
      const body = await res.json<CreatedDomain>();
      expect(body.id).not.toBe("dom_retry_then_reclaim");

      const row = await getDomainRow(domain);
      expect(row?.createdAt).toBeGreaterThanOrEqual(Date.now() - 60_000);
      expect(row?.updatedAt).toBe(row?.createdAt);
    });

    it("never reclaims a verified domain, even from the same project", async () => {
      const domain = uniqueDomain("verified-no-reclaim");
      await insertDomainRow({
        id: "dom_verified_holder",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "verified",
        verifiedAt: Date.now(),
        createdAt: Date.now() - STALE_AGE_MS,
      });

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(409);
      expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_EXISTS");

      const row = await getDomainRow(domain);
      expect(row?.id).toBe("dom_verified_holder");
      expect(row?.verificationStatus).toBe("verified");
    });

    it("never reclaims a row with historical verifiedAt even if now failed", async () => {
      const domain = uniqueDomain("historical-verified");
      await insertDomainRow({
        id: "dom_historical_verified",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "failed",
        verifiedAt: Date.now() - STALE_AGE_MS,
        createdAt: Date.now() - STALE_AGE_MS,
      });

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(409);
      expect((await res.json<ErrorBody>()).error.code).toBe("DOMAIN_EXISTS");

      const row = await getDomainRow(domain);
      expect(row?.id).toBe("dom_historical_verified");
      expect(row?.verifiedAt).not.toBeNull();
    });

    it("keeps normalized uniqueness: conflicting case variants hit one row", async () => {
      const label = uniqueDomain("norm").split(".")[0];
      const domain = `${label}.Example.COM`;
      const first = await createDomain(TEST_PROJECT_ID, domain);
      expect(first.status).toBe(201);

      // Same row must answer the differently-cased retry.
      const second = await createDomain(TEST_PROJECT_ID, domain.toUpperCase());
      expect(second.status).toBe(409);
      expect((await second.json<ErrorBody>()).error.code).toBe("DOMAIN_EXISTS");

      expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM custom_domains WHERE domain = ?")
        .bind(domain.toLowerCase()).first<{ n: number }>()).toEqual({ n: 1 });
    });

    it("replaces the old claim so the previous owner loses access", async () => {
      const domain = uniqueDomain("takeover");
      const createdAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_takeover_old",
        projectId: otherProjectId,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt,
      });
      const oldToken = "agentstate-verify-testrow000000000";
      const oldOwnerHeaders = await dashboardHeaders({}, OTHER_ORG_ID);

      // Old owner can still see it before the takeover.
      const before = await SELF.fetch(domainsUrl(otherProjectId, "/dom_takeover_old"), {
        headers: oldOwnerHeaders,
      });
      expect(before.status).toBe(200);

      const res = await createDomain(TEST_PROJECT_ID, domain);
      expect(res.status).toBe(201);
      const body = await res.json<CreatedDomain>();

      // New owner sees the replacement row under the new id; old id is gone.
      const row = await getDomainRow(domain);
      expect(row?.id).toBe(body.id);
      expect(row?.id).not.toBe("dom_takeover_old");

      const oldId = await env.DB.prepare("SELECT id FROM custom_domains WHERE id = ?")
        .bind("dom_takeover_old")
        .first<{ id: string }>();
      expect(oldId).toBeNull();

      // Old owner's verify against the stale id must not resurrect anything.
      const oldOwnerVerify = await SELF.fetch(
        domainsUrl(otherProjectId, "/dom_takeover_old/verify"),
        { method: "POST", headers: oldOwnerHeaders },
      );
      expect(oldOwnerVerify.status).toBe(404);
      const oldOwnerGet = await SELF.fetch(domainsUrl(otherProjectId, `/${body.id}`), {
        headers: oldOwnerHeaders,
      });
      expect(oldOwnerGet.status).toBe(404);

      // Old token can no longer verify the domain: the row carries the new
      // token, so a verification attempt with the old one must fail.
      expect(row?.verificationToken).not.toBe(oldToken);

      // Old owner cannot delete the replacement either.
      const oldOwnerDelete = await SELF.fetch(domainsUrl(otherProjectId, `/${body.id}`), {
        method: "DELETE",
        headers: oldOwnerHeaders,
      });
      expect(oldOwnerDelete.status).toBe(404);

      const stillThere = await getDomainRow(domain);
      expect(stillThere?.id).toBe(body.id);
    });

    it("concurrent adds for a new domain produce exactly one winner and no 500", async () => {
      const domain = uniqueDomain("concurrent-new");
      const db = serviceDb();

      const attempts = await Promise.all(
        Array.from({ length: 6 }, () =>
          createDomainService(db, TEST_PROJECT_ID, domain).then(
            (result) => ({ ok: true as const, result }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
        ),
      );

      const winners = attempts.filter((a) => a.ok);
      const losers = attempts.filter((a) => !a.ok);
      expect(winners.length).toBe(1);
      // Losers must surface the typed conflict, not an unexpected crash.
      for (const loser of losers) {
        expect((loser.error as Error).message).toBe("DOMAIN_EXISTS");
      }

      const rows = await env.DB.prepare("SELECT id FROM custom_domains WHERE domain = ?")
        .bind(domain)
        .all<{ id: string }>();
      expect(rows.results.length).toBe(1);
      expect(rows.results[0].id).toBe(winners[0]!.result.id);
    });

    it("concurrent adds for a stale reclaim produce exactly one winner and no 500", async () => {
      const domain = uniqueDomain("concurrent-reclaim");
      const createdAt = Date.now() - STALE_AGE_MS;
      await insertDomainRow({
        id: "dom_concurrent_reclaim_old",
        projectId: TEST_PROJECT_ID,
        domain,
        verificationStatus: "pending",
        verifiedAt: null,
        createdAt,
      });
      const db = serviceDb();

      const attempts = await Promise.all(
        Array.from({ length: 6 }, () =>
          createDomainService(db, TEST_PROJECT_ID, domain).then(
            (result) => ({ ok: true as const, result }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
        ),
      );

      const winners = attempts.filter((a) => a.ok);
      for (const loser of attempts.filter((a) => !a.ok)) {
        expect((loser.error as Error).message).toBe("DOMAIN_EXISTS");
      }
      expect(winners.length).toBe(1);

      const rows = await env.DB.prepare(
        "SELECT id, verification_token FROM custom_domains WHERE domain = ?",
      )
        .bind(domain)
        .all<{ id: string; verification_token: string }>();
      expect(rows.results.length).toBe(1);
      expect(rows.results[0].id).toBe(winners[0]!.result.id);
      expect(rows.results[0].verification_token).toBe(
        winners[0]!.result.verification_instructions.dns_txt.value,
      );
    });

    it.each(["pending", "failed"] as const)("reclaims %s exactly at the seven-day boundary", async (status) => {
      const domain = uniqueDomain("boundary");
      const base = Date.now();
      await insertDomainRow({
        id: "dom_boundary",
        projectId: otherProjectId,
        domain,
        verificationStatus: status,
        verifiedAt: null,
        createdAt: base,
      });

      const db = serviceDb();
      const clock = vi.spyOn(Date, "now");
      try {
        clock.mockReturnValue(base + RECLAIM_WINDOW_MS - 1);
        await expect(createDomainService(db, TEST_PROJECT_ID, domain)).rejects.toThrow("DOMAIN_UNAVAILABLE");
        expect((await getDomainRow(domain))?.id).toBe("dom_boundary");

        clock.mockReturnValue(base + RECLAIM_WINDOW_MS);
        const claimed = await createDomainService(db, TEST_PROJECT_ID, domain);
        expect(claimed.id).not.toBe("dom_boundary");
        expect(await getDomainRow(domain)).toMatchObject({
          id: claimed.id,
          projectId: TEST_PROJECT_ID,
          verificationStatus: "pending",
          createdAt: base + RECLAIM_WINDOW_MS,
          updatedAt: base + RECLAIM_WINDOW_MS,
        });
      } finally {
        clock.mockRestore();
      }
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
