import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  created_at: number;
}

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

interface ListResponse<T> {
  data: T[];
  pagination: { limit: number; next_cursor: string | null; total?: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversationV2(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/api/v2/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("V2 Conversations", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create conversation
  // -------------------------------------------------------------------------

  describe("POST /api/v2/conversations", () => {
    it("creates a minimal conversation without messages", async () => {
      const res = await createConversationV2({});
      expect(res.status).toBe(201);

      const body = await res.json<Conversation>();
      expect(body.id).toBeTruthy();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.external_id).toBeNull();
      expect(body.title).toBeNull();
      expect(body.metadata).toBeNull();
      expect(body.message_count).toBe(0);
      expect(body.token_count).toBe(0);
      // V2: messages not included in create response
      expect("messages" in body).toBe(false);
    });

    it("creates a conversation with initial messages", async () => {
      const res = await createConversationV2({
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi there", token_count: 10 },
        ],
      });
      expect(res.status).toBe(201);

      const body = await res.json<Conversation>();
      expect(body.message_count).toBe(2);
      expect(body.token_count).toBe(15);
      // V2: messages not included in create response
      expect("messages" in body).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await createConversationV2({});
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List conversations
  // -------------------------------------------------------------------------

  describe("GET /api/v2/conversations", () => {
    it("lists conversations for the project", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Conversation>>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(typeof body.pagination.limit).toBe("number");
      // V2: includes total count
      expect(typeof body.pagination.total).toBe("number");
    });

    it("returns 400 for negative cursor", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations?cursor=-1234567890", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 400 for non-numeric cursor", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations?cursor=not-a-number", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 400 for Infinity cursor", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations?cursor=Infinity", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 400 for cursor exceeding MAX_SAFE_INTEGER", async () => {
      const res = await SELF.fetch(`http://localhost/api/v2/conversations?cursor=${Number.MAX_SAFE_INTEGER + 1}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string; message: string } }>();
      expect(body.error.code).toBe("INVALID_CURSOR");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations");
      expect(res.status).toBe(401);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get conversation
  // -------------------------------------------------------------------------

  describe("GET /api/v2/conversations/:id", () => {
    it("returns conversation without messages by default", async () => {
      const createRes = await createConversationV2({
        title: "Test Convo",
        messages: [{ role: "user", content: "Hello?" }],
      });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(`http://localhost/api/v2/conversations/${created.id}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.id).toBe(created.id);
      expect(body.title).toBe("Test Convo");
      // V2: messages not included by default
      expect("messages" in body).toBe(false);
    });

    it("returns conversation with messages when ?include=messages", async () => {
      const createRes = await createConversationV2({
        title: "Test Convo",
        messages: [{ role: "user", content: "Hello?" }],
      });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(
        `http://localhost/api/v2/conversations/${created.id}?include=messages`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationWithMessages>();
      expect(body.id).toBe(created.id);
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].content).toBe("Hello?");
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations/does_not_exist_id", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations/any_id");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /:id — Update conversation (V2 uses PATCH instead of PUT)
  // -------------------------------------------------------------------------

  describe("PATCH /api/v2/conversations/:id", () => {
    it("updates the title", async () => {
      const createRes = await createConversationV2({ title: "Original Title" });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(`http://localhost/api/v2/conversations/${created.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Updated Title" }),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.title).toBe("Updated Title");
    });

    it("updates the metadata", async () => {
      const createRes = await createConversationV2({ metadata: { foo: "bar" } });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(`http://localhost/api/v2/conversations/${created.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ metadata: { foo: "baz", extra: true } }),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.metadata).toEqual({ foo: "baz", extra: true });
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations/nonexistent_id", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Doesn't Matter" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations/any_id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete conversation
  // -------------------------------------------------------------------------

  describe("DELETE /api/v2/conversations/:id", () => {
    it("deletes a conversation and returns 204", async () => {
      const createRes = await createConversationV2({
        messages: [{ role: "user", content: "Delete me" }],
      });
      const created = await createRes.json<Conversation>();

      const deleteRes = await SELF.fetch(`http://localhost/api/v2/conversations/${created.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(deleteRes.status).toBe(204);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/conversations/nonexistent_id", {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/messages — Append messages (V2 returns 204)
  // -------------------------------------------------------------------------

  describe("POST /api/v2/conversations/:id/messages", () => {
    it("appends messages and returns 204", async () => {
      const createRes = await createConversationV2({});
      const created = await createRes.json<Conversation>();

      const appendRes = await SELF.fetch(
        `http://localhost/api/v2/conversations/${created.id}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            messages: [{ role: "user", content: "Appended message", token_count: 8 }],
          }),
        },
      );
      // V2: Returns 204 instead of 201 with body
      expect(appendRes.status).toBe(204);

      // Verify message_count updated on the conversation
      const convRes = await SELF.fetch(
        `http://localhost/api/v2/conversations/${created.id}`,
        { headers: authHeaders() },
      );
      const conv = await convRes.json<Conversation>();
      expect(conv.message_count).toBe(1);
      expect(conv.token_count).toBe(8);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v2/conversations/nonexistent_id/messages",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
        },
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when messages array is empty", async () => {
      const createRes = await createConversationV2({});
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(
        `http://localhost/api/v2/conversations/${created.id}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ messages: [] }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /by-external-id/:eid — Lookup by external ID (V2: no messages by default)
  // -------------------------------------------------------------------------

  describe("GET /api/v2/conversations/by-external-id/:eid", () => {
    it("returns the conversation without messages when found by external_id", async () => {
      const eid = `lookup-ext-${Date.now()}`;
      const createRes = await createConversationV2({
        external_id: eid,
        title: "External Lookup",
        messages: [{ role: "user", content: "External message" }],
      });
      expect(createRes.status).toBe(201);

      const res = await SELF.fetch(
        `http://localhost/api/v2/conversations/by-external-id/${eid}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.external_id).toBe(eid);
      expect(body.title).toBe("External Lookup");
      // V2: messages not included by default
      expect("messages" in body).toBe(false);
    });

    it("returns 404 when no conversation matches the external_id", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v2/conversations/by-external-id/nonexistent-external-id",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v2/conversations/by-external-id/any-id",
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // V1 deprecation headers
  // -------------------------------------------------------------------------

  describe("V1 Deprecation Headers", () => {
    it("adds deprecation headers to V1 conversations endpoints", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
      expect(res.headers.get("Sunset")).toBe("2026-12-31");
      expect(res.headers.get("Link")).toContain("deprecation");
    });

    it("adds deprecation headers to V1 tags endpoints", async () => {
      const res = await SELF.fetch("http://localhost/v1/tags", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
      expect(res.headers.get("Sunset")).toBe("2026-12-31");
    });

    it("adds deprecation headers to V1 analytics endpoints", async () => {
      const res = await SELF.fetch("http://localhost/v1/projects/test-project/summary", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
    });
  });
});
