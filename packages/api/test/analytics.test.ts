import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject, authHeaders, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversation(body: Record<string, unknown> = {}) {
  return SELF.fetch("http://localhost/v1/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

interface AnalyticsResponse {
  summary: {
    total_conversations: number;
    total_messages: number;
    total_tokens: number;
    active_api_keys: number;
  };
  conversations_per_day: Array<{ date: string; count: number }>;
  messages_per_day: Array<{ date: string; count: number }>;
  tokens_per_day: Array<{ date: string; total: number }>;
  recent_conversations: Array<{
    id: string;
    title: string | null;
    message_count: number;
    token_count: number;
    updated_at: number;
  }>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Analytics", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/projects/:id/analytics
  // -------------------------------------------------------------------------

  describe("GET /api/v1/projects/:id/analytics", () => {
    it("returns the correct response shape", async () => {
      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      expect(res.status).toBe(200);

      const body = await res.json<AnalyticsResponse>();
      expect(body.summary).toBeDefined();
      expect(typeof body.summary.total_conversations).toBe("number");
      expect(typeof body.summary.total_messages).toBe("number");
      expect(typeof body.summary.total_tokens).toBe("number");
      expect(typeof body.summary.active_api_keys).toBe("number");
      expect(Array.isArray(body.conversations_per_day)).toBe(true);
      expect(Array.isArray(body.messages_per_day)).toBe(true);
      expect(Array.isArray(body.tokens_per_day)).toBe(true);
      expect(Array.isArray(body.recent_conversations)).toBe(true);
    });

    it("defaults to 30d range", async () => {
      // Both explicit ?range=30d and no range param should return the same result
      const resDefault = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      const resExplicit = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics?range=30d`,
      );

      expect(resDefault.status).toBe(200);
      expect(resExplicit.status).toBe(200);

      const bodyDefault = await resDefault.json<AnalyticsResponse>();
      const bodyExplicit = await resExplicit.json<AnalyticsResponse>();

      // Summary stats should match since both use the same range
      expect(bodyDefault.summary).toEqual(bodyExplicit.summary);
    });

    it("supports 7d range", async () => {
      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics?range=7d`,
      );
      expect(res.status).toBe(200);

      const body = await res.json<AnalyticsResponse>();
      expect(body.summary).toBeDefined();
      expect(Array.isArray(body.conversations_per_day)).toBe(true);
    });

    it("counts match actual data after creating conversations", async () => {
      // Record baseline
      const baselineRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      const baseline = await baselineRes.json<AnalyticsResponse>();
      const baseConvs = baseline.summary.total_conversations;
      const baseMsgs = baseline.summary.total_messages;
      const baseTokens = baseline.summary.total_tokens;

      // Create a conversation with 2 messages
      await createConversation({
        title: "Analytics Test",
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi there!", token_count: 10 },
        ],
      });

      // Verify counts increased
      const afterRes = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      const after = await afterRes.json<AnalyticsResponse>();

      expect(after.summary.total_conversations).toBe(baseConvs + 1);
      expect(after.summary.total_messages).toBe(baseMsgs + 2);
      expect(after.summary.total_tokens).toBe(baseTokens + 15);
    });

    it("includes recently created conversations in recent_conversations", async () => {
      const createRes = await createConversation({ title: "Recent Analytics Conv" });
      expect(createRes.status).toBe(201);
      const created = await createRes.json<{ id: string }>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      const body = await res.json<AnalyticsResponse>();

      const recentIds = body.recent_conversations.map((c) => c.id);
      expect(recentIds).toContain(created.id);
    });

    it("reports active_api_keys count", async () => {
      const res = await SELF.fetch(
        `http://localhost/api/v1/projects/${TEST_PROJECT_ID}/analytics`,
      );
      const body = await res.json<AnalyticsResponse>();

      // The seed creates one active API key
      expect(body.summary.active_api_keys).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/conversations/:id/analytics
  // -------------------------------------------------------------------------

  interface ConversationAnalyticsResponse {
    conversation_id: string;
    title: string | null;
    message_count: number;
    token_count: number;
    tags: string[];
    duration_ms: number;
    messages_by_role: Record<string, { count: number; tokens: number }>;
    created_at: number;
    updated_at: number;
  }

  describe("GET /v1/conversations/:id/analytics", () => {
    it("returns the correct response shape for a conversation with messages", async () => {
      const createRes = await createConversation({
        title: "Conv Analytics Test",
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi there!", token_count: 10 },
          { role: "user", content: "How are you?", token_count: 4 },
        ],
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json<{ id: string }>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.conversation_id).toBe(created.id);
      expect(body.title).toBe("Conv Analytics Test");
      expect(body.message_count).toBe(3);
      expect(body.token_count).toBe(19);
      expect(Array.isArray(body.tags)).toBe(true);
      expect(typeof body.duration_ms).toBe("number");
      expect(body.duration_ms).toBeGreaterThanOrEqual(0);
      expect(typeof body.messages_by_role).toBe("object");
      expect(typeof body.created_at).toBe("number");
      expect(typeof body.updated_at).toBe("number");
    });

    it("breaks down messages_by_role correctly", async () => {
      const createRes = await createConversation({
        title: "Role Breakdown",
        messages: [
          { role: "system", content: "You are a helpful assistant.", token_count: 8 },
          { role: "user", content: "Hi", token_count: 3 },
          { role: "assistant", content: "Hello!", token_count: 6 },
          { role: "user", content: "Thanks", token_count: 2 },
          { role: "assistant", content: "You're welcome!", token_count: 5 },
        ],
      });
      const created = await createRes.json<{ id: string }>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/analytics`,
        { headers: authHeaders() },
      );
      const body = await res.json<ConversationAnalyticsResponse>();

      expect(body.messages_by_role.system).toEqual({ count: 1, tokens: 8 });
      expect(body.messages_by_role.user).toEqual({ count: 2, tokens: 5 });
      expect(body.messages_by_role.assistant).toEqual({ count: 2, tokens: 11 });
    });

    it("returns empty messages_by_role for a conversation with no messages", async () => {
      const createRes = await createConversation({ title: "Empty Conv" });
      const created = await createRes.json<{ id: string }>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${created.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.message_count).toBe(0);
      expect(body.token_count).toBe(0);
      expect(Object.keys(body.messages_by_role).length).toBe(0);
    });

    it("returns 404 for a non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_conv_id/analytics",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/any_id/analytics",
      );
      expect(res.status).toBe(401);
    });
  });
});
