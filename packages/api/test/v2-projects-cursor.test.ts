import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import { listProjects, validateCursor } from "../src/services/v2-projects";
import { applyMigrations, seedProject, TEST_ORG_ID } from "./setup";

// Build a Drizzle client over the miniflare D1 binding, the same way the app
// middleware does, so we can exercise the service directly (the v2 route is
// Clerk-authed and not exercised end-to-end here).
function getDB() {
  return drizzle(env.DB);
}

describe("v2-projects cursor pagination", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("rejects composite cursors missing the id half", () => {
    expect(validateCursor("1700000000000.")).toEqual({
      valid: false,
      error: "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
    });
  });

  it("accepts composite and legacy bare-timestamp cursors", () => {
    expect(validateCursor(undefined)).toEqual({ valid: true });
    expect(validateCursor("1700000000000")).toEqual({ valid: true });
    expect(validateCursor("1700000000000.abc123")).toEqual({ valid: true });
  });

  it("paginates same-timestamp projects without dropping rows", async () => {
    const db = getDB();
    // Insert 5 projects that share the SAME createdAt — this is the exact
    // scenario the bare-timestamp cursor drops rows for.
    const sharedTs = 1700000000000;
    const slugs = ["same-ts-a", "same-ts-b", "same-ts-c", "same-ts-d", "same-ts-e"];
    const ids: string[] = [];
    for (const slug of slugs) {
      const id = `proj_samets_${slug}`;
      ids.push(id);
      await env.DB.prepare(
        "INSERT INTO projects (id, org_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(id, TEST_ORG_ID, `Same TS ${slug}`, slug, sharedTs)
        .run();
    }

    // Walk all pages with a tiny limit; collect ids.
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    // Guard against an accidental infinite loop.
    while (pages < 10) {
      const result = await listProjects(db, {
        clerkOrgId: "clerk_test_org_001",
        limit: 2,
        cursor,
      });
      pages += 1;
      seen.push(...result.data.map((p) => p.project_id));
      if (!result.pagination.next_cursor) break;
      cursor = result.pagination.next_cursor;
    }

    // All 5 same-timestamp projects must be present (no drops), and we must
    // not have emitted a trailing empty page.
    for (const id of ids) {
      expect(seen).toContain(id);
    }
    // The 5 same-ts projects, plus the seeded Test Project for this org.
    const orgProjectIds = seen.filter((id) => id.startsWith("proj_samets_"));
    expect(orgProjectIds).toHaveLength(5);

    // Cleanup so the extra rows don't bleed into other tests.
    for (const id of ids) {
      await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    }
  });
});
