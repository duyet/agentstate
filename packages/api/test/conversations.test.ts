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
  pagination: { limit: number; next_cursor: string | null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversation(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/v1/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Conversations", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // POST / — Create conversation
  // -------------------------------------------------------------------------

  describe("POST /v1/conversations", () => {
    it("creates a minimal conversation without messages", async () => {
      const res = await createConversation({});
      expect(res.status).toBe(201);

      const body = await res.json<ConversationWithMessages>();
      expect(body.id).toBeTruthy();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.external_id).toBeNull();
      expect(body.title).toBeNull();
      expect(body.metadata).toBeNull();
      expect(body.message_count).toBe(0);
      expect(body.token_count).toBe(0);
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBe(0);
    });

    it("creates a conversation with initial messages", async () => {
      const res = await createConversation({
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi there", token_count: 10 },
        ],
      });
      expect(res.status).toBe(201);

      const body = await res.json<ConversationWithMessages>();
      expect(body.message_count).toBe(2);
      expect(body.token_count).toBe(15);
      expect(body.messages.length).toBe(2);
      expect(body.messages[0].role).toBe("user");
      expect(body.messages[0].content).toBe("Hello");
      expect(body.messages[1].role).toBe("assistant");
    });

    it("creates a conversation with metadata", async () => {
      const res = await createConversation({
        metadata: { source: "web", version: 2 },
      });
      expect(res.status).toBe(201);

      const body = await res.json<ConversationWithMessages>();
      expect(body.metadata).toEqual({ source: "web", version: 2 });
    });

    it("creates a conversation with external_id", async () => {
      const res = await createConversation({
        external_id: "ext-123",
        title: "My Chat",
      });
      expect(res.status).toBe(201);

      const body = await res.json<ConversationWithMessages>();
      expect(body.external_id).toBe("ext-123");
      expect(body.title).toBe("My Chat");
    });

    it("returns 409 when external_id already exists for the project", async () => {
      const eid = `dup-ext-${Date.now()}`;
      const first = await createConversation({ external_id: eid });
      expect(first.status).toBe(201);

      const second = await createConversation({ external_id: eid });
      expect(second.status).toBe(409);

      const body = await second.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid JSON", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: authHeaders(),
        body: "not-json{{{",
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — List conversations
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations", () => {
    it("lists conversations for the project", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Conversation>>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(typeof body.pagination.limit).toBe("number");
    });

    it("supports limit query param", async () => {
      // Create 3 conversations
      for (let i = 0; i < 3; i++) {
        await createConversation({ title: `Conversation ${i}` });
      }

      const res = await SELF.fetch("http://localhost/v1/conversations?limit=2", {
        headers: authHeaders(),
      });
      const body = await res.json<ListResponse<Conversation>>();
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pagination.limit).toBe(2);
    });

    it("returns next_cursor when there are more results", async () => {
      // Ensure we have at least 3 conversations
      await createConversation({});
      await createConversation({});
      await createConversation({});

      const res = await SELF.fetch("http://localhost/v1/conversations?limit=1", {
        headers: authHeaders(),
      });
      const body = await res.json<ListResponse<Conversation>>();

      if (body.data.length === 1) {
        // Only assert cursor if we got exactly 1 result (limit reached)
        expect(body.pagination.next_cursor).not.toBeNull();
      }
    });

    it("supports cursor-based pagination", async () => {
      // Get first page
      const page1Res = await SELF.fetch("http://localhost/v1/conversations?limit=2", {
        headers: authHeaders(),
      });
      const page1 = await page1Res.json<ListResponse<Conversation>>();

      if (page1.pagination.next_cursor) {
        const page2Res = await SELF.fetch(
          `http://localhost/v1/conversations?limit=2&cursor=${page1.pagination.next_cursor}`,
          { headers: authHeaders() },
        );
        expect(page2Res.status).toBe(200);
        const page2 = await page2Res.json<ListResponse<Conversation>>();
        expect(Array.isArray(page2.data)).toBe(true);

        // No overlap between pages
        const page1Ids = new Set(page1.data.map((c) => c.id));
        for (const conv of page2.data) {
          expect(page1Ids.has(conv.id)).toBe(false);
        }
      }
    });

    it("supports ascending order", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations?order=asc", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<ListResponse<Conversation>>();

      if (body.data.length > 1) {
        for (let i = 1; i < body.data.length; i++) {
          expect(body.data[i].updated_at).toBeGreaterThanOrEqual(body.data[i - 1].updated_at);
        }
      }
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — Get conversation with messages
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations/:id", () => {
    it("returns a conversation with its messages", async () => {
      const createRes = await createConversation({
        title: "Test Convo",
        messages: [{ role: "user", content: "Hello?" }],
      });
      const created = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(`http://localhost/v1/conversations/${created.id}`, {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<ConversationWithMessages>();
      expect(body.id).toBe(created.id);
      expect(body.title).toBe("Test Convo");
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].content).toBe("Hello?");
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/does_not_exist_id", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/any_id");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /:id — Update conversation
  // -------------------------------------------------------------------------

  describe("PUT /v1/conversations/:id", () => {
    it("updates the title", async () => {
      const createRes = await createConversation({ title: "Original Title" });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(`http://localhost/v1/conversations/${created.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Updated Title" }),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.title).toBe("Updated Title");
    });

    it("updates the metadata", async () => {
      const createRes = await createConversation({ metadata: { foo: "bar" } });
      const created = await createRes.json<Conversation>();

      const res = await SELF.fetch(`http://localhost/v1/conversations/${created.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ metadata: { foo: "baz", extra: true } }),
      });
      expect(res.status).toBe(200);

      const body = await res.json<Conversation>();
      expect(body.metadata).toEqual({ foo: "baz", extra: true });
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/nonexistent_id", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ title: "Doesn't Matter" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/any_id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete conversation
  // -------------------------------------------------------------------------

  describe("DELETE /v1/conversations/:id", () => {
    it("deletes a conversation and returns 204", async () => {
      const createRes = await createConversation({
        messages: [{ role: "user", content: "Delete me" }],
      });
      const created = await createRes.json<ConversationWithMessages>();

      const deleteRes = await SELF.fetch(`http://localhost/v1/conversations/${created.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(deleteRes.status).toBe(204);
    });

    it("cascades deletion to messages", async () => {
      // Create conversation with messages
      const createRes = await createConversation({
        messages: [
          { role: "user", content: "Message 1" },
          { role: "assistant", content: "Message 2" },
        ],
      });
      const created = await createRes.json<ConversationWithMessages>();
      const conversationId = created.id;

      // Verify messages exist before deletion
      const beforeRes = await SELF.fetch(
        `http://localhost/v1/conversations/${conversationId}/messages`,
        { headers: authHeaders() },
      );
      const before = await beforeRes.json<ListResponse<Message>>();
      expect(before.data.length).toBe(2);

      // Delete conversation
      await SELF.fetch(`http://localhost/v1/conversations/${conversationId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      // Verify conversation is gone (404)
      const afterConvRes = await SELF.fetch(
        `http://localhost/v1/conversations/${conversationId}`,
        { headers: authHeaders() },
      );
      expect(afterConvRes.status).toBe(404);

      // Verify messages were cascaded — query D1 directly
      const result = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?`,
      )
        .bind(conversationId)
        .first<{ count: number }>();
      expect(result!.count).toBe(0);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/nonexistent_id", {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/messages — Append messages
  // -------------------------------------------------------------------------

  describe("POST /v1/conversations/:id/messages", () => {
    it("appends messages and updates counts", async () => {
      const createRes = await createConversation({});
      const created = await createRes.json<ConversationWithMessages>();

      const appendRes = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            messages: [
              { role: "user", content: "Appended message", token_count: 8 },
            ],
          }),
        },
      );
      expect(appendRes.status).toBe(201);

      const body = await appendRes.json<{ messages: Message[] }>();
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].role).toBe("user");
      expect(body.messages[0].content).toBe("Appended message");
      expect(body.messages[0].token_count).toBe(8);

      // Verify message_count updated on the conversation
      const convRes = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}`,
        { headers: authHeaders() },
      );
      const conv = await convRes.json<ConversationWithMessages>();
      expect(conv.message_count).toBe(1);
      expect(conv.token_count).toBe(8);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_id/messages",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
        },
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when messages array is empty", async () => {
      const createRes = await createConversation({});
      const created = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/messages`,
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
  // GET /:id/messages — List messages with pagination
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations/:id/messages", () => {
    it("lists all messages for a conversation", async () => {
      const createRes = await createConversation({
        messages: [
          { role: "user", content: "First" },
          { role: "assistant", content: "Second" },
          { role: "user", content: "Third" },
        ],
      });
      const created = await createRes.json<ConversationWithMessages>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/messages`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ListResponse<Message>>();
      expect(body.data.length).toBe(3);
      expect(body.data[0].content).toBe("First");
      expect(body.data[2].content).toBe("Third");
    });

    it("supports after-cursor pagination", async () => {
      // Create conversation with no initial messages
      const createRes = await createConversation({});
      const created = await createRes.json<ConversationWithMessages>();
      const convId = created.id;

      // Append messages in separate requests to ensure distinct created_at timestamps.
      // The server uses Date.now() per request so each batch gets a unique timestamp.
      const append = async (content: string) => {
        const res = await SELF.fetch(
          `http://localhost/v1/conversations/${convId}/messages`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              messages: [{ role: "user", content }],
            }),
          },
        );
        expect(res.status).toBe(201);
        // Small delay to guarantee monotonically increasing timestamps
        await new Promise((r) => setTimeout(r, 5));
      };

      await append("Msg A");
      await append("Msg B");
      await append("Msg C");

      // Get first page with limit=1 — should return "Msg A"
      const page1Res = await SELF.fetch(
        `http://localhost/v1/conversations/${convId}/messages?limit=1`,
        { headers: authHeaders() },
      );
      const page1 = await page1Res.json<ListResponse<Message>>();
      expect(page1.data.length).toBe(1);
      expect(page1.data[0].content).toBe("Msg A");
      expect(page1.pagination.next_cursor).not.toBeNull();

      // Get second page using the cursor — should return "Msg B"
      const page2Res = await SELF.fetch(
        `http://localhost/v1/conversations/${convId}/messages?limit=1&after=${page1.pagination.next_cursor}`,
        { headers: authHeaders() },
      );
      expect(page2Res.status).toBe(200);
      const page2 = await page2Res.json<ListResponse<Message>>();
      expect(page2.data.length).toBe(1);
      expect(page2.data[0].content).toBe("Msg B");
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_id/messages",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /by-external-id/:eid — Lookup by external ID
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations/by-external-id/:eid", () => {
    it("returns the conversation with messages when found by external_id", async () => {
      const eid = `lookup-ext-${Date.now()}`;
      const createRes = await createConversation({
        external_id: eid,
        title: "External Lookup",
        messages: [{ role: "user", content: "External message" }],
      });
      expect(createRes.status).toBe(201);

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/by-external-id/${eid}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationWithMessages>();
      expect(body.external_id).toBe(eid);
      expect(body.title).toBe("External Lookup");
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].content).toBe("External message");
    });

    it("returns 404 when no conversation matches the external_id", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/by-external-id/nonexistent-external-id",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/by-external-id/any-id",
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /bulk-delete — Bulk delete conversations
  // -------------------------------------------------------------------------

  describe("POST /v1/conversations/bulk-delete", () => {
    it("deletes multiple conversations and their messages", async () => {
      const res1 = await createConversation({
        title: "Bulk Delete A",
        messages: [{ role: "user", content: "msg a" }],
      });
      const res2 = await createConversation({
        title: "Bulk Delete B",
        messages: [{ role: "user", content: "msg b" }],
      });
      const c1 = await res1.json<ConversationWithMessages>();
      const c2 = await res2.json<ConversationWithMessages>();

      const deleteRes = await SELF.fetch("http://localhost/v1/conversations/bulk-delete", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: [c1.id, c2.id] }),
      });
      expect(deleteRes.status).toBe(200);

      const body = await deleteRes.json<{ deleted: number }>();
      expect(body.deleted).toBe(2);

      // Verify both are gone
      const get1 = await SELF.fetch(`http://localhost/v1/conversations/${c1.id}`, {
        headers: authHeaders(),
      });
      expect(get1.status).toBe(404);

      const get2 = await SELF.fetch(`http://localhost/v1/conversations/${c2.id}`, {
        headers: authHeaders(),
      });
      expect(get2.status).toBe(404);

      // Verify messages were cascaded
      const msgCount = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM messages WHERE conversation_id IN (?, ?)`,
      )
        .bind(c1.id, c2.id)
        .first<{ count: number }>();
      expect(msgCount!.count).toBe(0);
    });

    it("ignores non-existent IDs and only deletes existing ones", async () => {
      const res = await createConversation({ title: "Bulk Keep" });
      const created = await res.json<ConversationWithMessages>();

      const deleteRes = await SELF.fetch("http://localhost/v1/conversations/bulk-delete", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: [created.id, "nonexistent_id_1", "nonexistent_id_2"] }),
      });
      expect(deleteRes.status).toBe(200);

      const body = await deleteRes.json<{ deleted: number }>();
      expect(body.deleted).toBe(1);
    });

    it("returns 400 when ids array is empty", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/bulk-delete", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when ids array exceeds the 100-item limit", async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`);
      const res = await SELF.fetch("http://localhost/v1/conversations/bulk-delete", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: tooManyIds }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["some_id"] }),
      });
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /export — Bulk export
  // -------------------------------------------------------------------------

  describe("POST /v1/conversations/export", () => {
    it("exports all conversations when no IDs provided", async () => {
      // Create a couple of conversations
      await createConversation({ title: "Export A" });
      await createConversation({ title: "Export B" });

      const res = await SELF.fetch("http://localhost/v1/conversations/export", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);

      const body = await res.json<{ data: ConversationWithMessages[]; count: number }>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBe(body.data.length);
      expect(body.count).toBeGreaterThanOrEqual(2);

      // Each exported item should include messages array
      for (const conv of body.data) {
        expect(Array.isArray(conv.messages)).toBe(true);
      }
    });

    it("exports only specified conversations by IDs", async () => {
      const res1 = await createConversation({ title: "Specific A" });
      const res2 = await createConversation({ title: "Specific B" });
      await createConversation({ title: "Should Not Export" });

      const c1 = await res1.json<ConversationWithMessages>();
      const c2 = await res2.json<ConversationWithMessages>();

      const exportRes = await SELF.fetch("http://localhost/v1/conversations/export", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: [c1.id, c2.id] }),
      });
      expect(exportRes.status).toBe(200);

      const body = await exportRes.json<{ data: ConversationWithMessages[]; count: number }>();
      expect(body.count).toBe(2);

      const exportedIds = body.data.map((c) => c.id);
      expect(exportedIds).toContain(c1.id);
      expect(exportedIds).toContain(c2.id);
    });

    it("returns 400 when ids contains non-string elements", async () => {
      const res = await SELF.fetch("http://localhost/v1/conversations/export", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: [123, true, null] }),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 when ids array exceeds the 100-item limit", async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`);
      const res = await SELF.fetch("http://localhost/v1/conversations/export", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids: tooManyIds }),
      });
      expect(res.status).toBe(400);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("BAD_REQUEST");
    });
  });
});
