import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { sessionCookie, signTestSessionToken } from "./clerk-jwt";
import { applyIdentityMigration, applyMigrations, seedProject } from "./setup";

async function headers(userId: string, claims: Record<string, unknown> = {}) {
  return {
    Cookie: sessionCookie(await signTestSessionToken({ userId, noOrg: true, claims })),
    "Content-Type": "application/json",
  };
}
async function list(h: Record<string, string>) {
  const response = await SELF.fetch("http://localhost/api/v1/projects", { headers: h });
  expect(response.status).toBe(200);
  return response.json<{ data: { id: string; org_id: string }[] }>();
}
async function create(h: Record<string, string>, slug: string) {
  const response = await SELF.fetch("http://localhost/api/v1/projects", {
    method: "POST",
    headers: h,
    body: JSON.stringify({ name: slug, slug }),
  });
  expect(response.status).toBe(201);
  return response.json<{ project: { id: string; org_id: string }; api_key: { key: string } }>();
}

describe("persisted organization identity", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("provisions once on concurrent first reads, without needing a project or sync write", async () => {
    const h = await headers("user_FirstRead");
    await Promise.all(Array.from({ length: 5 }, () => list(h)));
    const bindings = await env.DB.prepare(
      "SELECT organization_id FROM organization_identities WHERE clerk_subject = ?",
    )
      .bind("user_FirstRead")
      .all();
    expect(bindings.results).toHaveLength(1);
    const orgs = await env.DB.prepare("SELECT id FROM organizations WHERE clerk_org_id = ?")
      .bind("personal:user_FirstRead")
      .all();
    expect(orgs.results).toHaveLength(1);
  });

  it("keeps Personal projects across org attach and return, without sharing them", async () => {
    const personal = await headers("user_Owner");
    const team = await headers("user_Owner", { o: { id: "org_Team" } });
    const other = await headers("user_Member", { org_id: "org_Team" });
    const a = await create(personal, "same-slug");
    expect((await list(team)).data).toEqual([]);
    const b = await create(team, "same-slug");
    expect(b.project.org_id).not.toBe(a.project.org_id);
    expect((await list(other)).data.map((p) => p.id)).toEqual([b.project.id]);
    expect((await list(personal)).data.map((p) => p.id)).toEqual([a.project.id]);
    for (const [h, id] of [
      [personal, a.project.id],
      [team, b.project.id],
    ] as const) {
      const res = await SELF.fetch("http://localhost/api/v1/projects/by-slug/same-slug", {
        headers: h,
      });
      expect(res.status).toBe(200);
      expect((await res.json<{ id: string }>()).id).toBe(id);
    }
    const denied = await SELF.fetch(`http://localhost/api/v1/projects/${a.project.id}`, {
      headers: other,
    });
    expect(denied.status).toBe(404);
  });

  it("uses a persisted binding even after compatibility identity drift", async () => {
    const h = await headers("user_Stable");
    const { project } = await create(h, "stable");
    await env.DB.prepare(
      "UPDATE organizations SET clerk_org_id = 'historical-display-value' WHERE id = ?",
    )
      .bind(project.org_id)
      .run();
    expect((await list(h)).data.map((p) => p.id)).toEqual([project.id]);
    const next = await create(h, "still-stable");
    expect(next.project.org_id).toBe(project.org_id);
    for (const suffix of ["analytics", "domains", "traces"]) {
      const response = await SELF.fetch(
        `http://localhost/api/v1/projects/${project.id}/${suffix}`,
        { headers: h },
      );
      expect(response.status).toBe(200);
    }
    const sync = await SELF.fetch("http://localhost/api/v1/organizations/sync", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(sync.status).toBe(200);
    expect(await sync.json<{ id: string; name: string }>()).toMatchObject({
      id: project.org_id,
      name: "Updated",
    });
  });

  it.each([
    { o: {} },
    { o: null },
    { o: { id: "" } },
    { o_id: 123 },
    { o: { id: "org_A" }, org_id: "org_B" },
    { o_id: "default" },
    { o_id: "personal:user_Victim" },
  ])("rejects malformed/conflicting signed claims without provisioning: %j", async (claims) => {
    const response = await SELF.fetch("http://localhost/api/v1/projects", {
      headers: await headers("user_Invalid", claims),
    });
    expect(response.status).toBe(401);
    expect(
      await env.DB.prepare(
        "SELECT * FROM organization_identities WHERE clerk_subject = 'user_Invalid'",
      ).first(),
    ).toBeNull();
  });

  it("reports an unbound exact legacy match instead of silently replacing or adopting it", async () => {
    await env.DB.prepare(
      "INSERT INTO organizations VALUES ('legacy', 'personal:user_Legacy', 'Legacy', 1)",
    ).run();
    const response = await SELF.fetch("http://localhost/api/v1/projects", {
      headers: await headers("user_Legacy"),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "IDENTITY_CONFLICT" } });
    expect(
      await env.DB.prepare(
        "SELECT * FROM organization_identities WHERE organization_id = 'legacy'",
      ).first(),
    ).toBeNull();
  });

  it("migrates existing personal and team rows in place, quarantining ambiguous legacy rows", async () => {
    // Recreate the pre-migration state, then execute the actual committed SQL.
    await env.DB.prepare("DROP TABLE organization_identities").run();
    for (const [id, external] of [
      ["personal-old", "personal:user_Migrated"],
      ["team-old", "org_Migrated"],
      ["shared-old", "default"],
      ["unknown-old", "personal:"],
      ["malformed-old", "org_bad-id"],
    ]) {
      await env.DB.prepare("INSERT INTO organizations VALUES (?, ?, 'Old', 1)")
        .bind(id, external)
        .run();
      await env.DB.prepare(
        "INSERT INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, 'Old', ?, 1)",
      )
        .bind(`project-${id}`, id, `slug-${id}`)
        .run();
    }
    await applyIdentityMigration();
    const personal = await headers("user_Migrated");
    expect((await list(personal)).data).toEqual([
      expect.objectContaining({ id: "project-personal-old", org_id: "personal-old" }),
    ]);
    const team = await headers("user_Migrated", { o: { id: "org_Migrated" } });
    expect((await list(team)).data).toEqual([
      expect.objectContaining({ id: "project-team-old", org_id: "team-old" }),
    ]);
    expect((await list(await headers("user_Unrelated"))).data).toEqual([]);
    for (const id of ["shared-old", "unknown-old", "malformed-old"]) {
      expect(
        await env.DB.prepare("SELECT * FROM organization_identities WHERE organization_id = ?")
          .bind(id)
          .first(),
      ).toBeNull();
      expect(
        await env.DB.prepare("SELECT id FROM projects WHERE org_id = ?").bind(id).first(),
      ).not.toBeNull();
    }
  });
});
