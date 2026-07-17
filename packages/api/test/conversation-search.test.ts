import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface CreatedConversation {
  id: string;
  updated_at: number;
}

interface SearchResult {
  id: string;
  title: string | null;
  snippet: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

interface SearchResponse {
  data: SearchResult[];
  next_cursor: string | null;
}

interface ErrorBody {
  error: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversationWithMessage(content: string): Promise<CreatedConversation> {
  const res = await SELF.fetch("http://localhost/v1/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages: [{ role: "user", content }] }),
  });
  expect(res.status).toBe(201);
  return res.json<CreatedConversation>();
}

async function search(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return SELF.fetch(`http://localhost/v1/conversations/search?${qs}`, {
    headers: authHeaders(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /v1/conversations/search", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("finds the conversation whose message contains the query and includes a snippet", async () => {
    const marker = `HAPPY_${Date.now()}`;
    const match = await createConversationWithMessage(`before ${marker} after`);
    await createConversationWithMessage("totally unrelated content");
    await createConversationWithMessage("also unrelated");

    const res = await search({ q: marker });
    expect(res.status).toBe(200);

    const body = await res.json<SearchResponse>();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(match.id);
    expect(body.data[0].snippet).toContain(marker);
  });

  // -------------------------------------------------------------------------
  // Wildcard-literal escaping — security-relevant
  // -------------------------------------------------------------------------

  it("treats '%' as a literal character, not a LIKE wildcard", async () => {
    // If '%' were left unescaped, the trailing '%' in the LIKE pattern would
    // become a wildcard matching "anything after", so the 'x' variant would
    // incorrectly match too. Escaping must make '%' match only itself.
    const ts = Date.now();
    const percentContent = `probe${ts}100%tail`;
    const otherContent = `probe${ts}100xtail`;

    const literal = await createConversationWithMessage(percentContent);
    const other = await createConversationWithMessage(otherContent);

    const res = await search({ q: `probe${ts}100%` });
    expect(res.status).toBe(200);

    const body = await res.json<SearchResponse>();
    const ids = body.data.map((r) => r.id);
    expect(ids).toContain(literal.id);
    expect(ids).not.toContain(other.id);
  });

  it("treats '_' as a literal character, not a LIKE single-char wildcard", async () => {
    // Unescaped, '_' matches any single character, so "axb" would incorrectly
    // match a search for "a_b" too. Escaping must require the literal '_'.
    const ts = Date.now();
    const underscoreContent = `probe${ts}a_btail`;
    const otherContent = `probe${ts}axbtail`;

    const literal = await createConversationWithMessage(underscoreContent);
    const other = await createConversationWithMessage(otherContent);

    const res = await search({ q: `probe${ts}a_b` });
    expect(res.status).toBe(200);

    const body = await res.json<SearchResponse>();
    const ids = body.data.map((r) => r.id);
    expect(ids).toContain(literal.id);
    expect(ids).not.toContain(other.id);
  });

  it("matches a literal '[' since SQLite LIKE does not treat it as a wildcard class", async () => {
    const ts = Date.now();
    const bracketContent = `probe${ts}[bracket]tail`;
    const bracket = await createConversationWithMessage(bracketContent);

    const res = await search({ q: `probe${ts}[` });
    expect(res.status).toBe(200);

    const body = await res.json<SearchResponse>();
    expect(body.data.map((r) => r.id)).toContain(bracket.id);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it("returns 400 BAD_REQUEST when 'q' is missing", async () => {
    const res = await search({ limit: "5" });
    expect(res.status).toBe(400);

    const body = await res.json<ErrorBody>();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 BAD_REQUEST when 'q' is empty", async () => {
    const res = await search({ q: "" });
    expect(res.status).toBe(400);

    const body = await res.json<ErrorBody>();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 INVALID_CURSOR for a malformed cursor", async () => {
    // search.ts's cursor validation parses the timestamp portion with Number();
    // a non-numeric cursor fails that check before ever reaching the service.
    const res = await search({ q: "anything", cursor: "abc" });
    expect(res.status).toBe(400);

    const body = await res.json<ErrorBody>();
    expect(body.error.code).toBe("INVALID_CURSOR");
  });

  // -------------------------------------------------------------------------
  // Cursor pagination
  // -------------------------------------------------------------------------

  it("paginates matching conversations with no overlap and no gaps across pages", async () => {
    const marker = `PAGINATE_${Date.now()}`;
    const created: string[] = [];
    for (let i = 0; i < 5; i++) {
      const conv = await createConversationWithMessage(`item ${i} ${marker}`);
      created.push(conv.id);
      // Small delay so updated_at is monotonically increasing across rows,
      // exercising the (updated_at, id) composite ordering deterministically.
      await new Promise((r) => setTimeout(r, 5));
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    while (true) {
      pages += 1;
      if (pages > 10) throw new Error("pagination did not terminate");

      const res: Response = await search({
        q: marker,
        limit: "2",
        ...(cursor ? { cursor } : {}),
      });
      expect(res.status).toBe(200);

      const body = await res.json<SearchResponse>();
      for (const row of body.data) seen.push(row.id);
      cursor = body.next_cursor;
      if (!cursor) break;
    }

    // Union of all pages equals the full match set, with no duplicates
    // (intersection between pages is empty).
    expect(new Set(seen).size).toBe(seen.length);
    expect(new Set(seen)).toEqual(new Set(created));
  });

  it("accepts a bare-timestamp legacy cursor (without the '.id' suffix)", async () => {
    const marker = `LEGACY_CURSOR_${Date.now()}`;
    const older = await createConversationWithMessage(`old ${marker}`);
    await new Promise((r) => setTimeout(r, 5));
    const newer = await createConversationWithMessage(`new ${marker}`);

    // Bare timestamp cursor (no ".id") mirrors what pre-composite-cursor
    // clients would have sent; the route must still accept it.
    const res = await search({ q: marker, cursor: String(newer.updated_at) });
    expect(res.status).toBe(200);

    const body = await res.json<SearchResponse>();
    // Strictly-older-than-cursor semantics: the newer row (used as the cursor
    // value) must not reappear on this "page after it".
    expect(body.data.map((r) => r.id)).not.toContain(newer.id);
    expect(body.data.map((r) => r.id)).toContain(older.id);
  });
});
