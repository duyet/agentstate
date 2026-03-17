import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject } from "./setup";

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

async function addTag(conversationId: string, tag: string) {
  return SELF.fetch(`http://localhost/v1/conversations/${conversationId}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ tags: [tag] }),
  });
}

// ---------------------------------------------------------------------------
// Types for response shapes
// ---------------------------------------------------------------------------

interface SummaryResponse {
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  avg_messages_per_conversation: number;
  avg_tokens_per_conversation: number;
  period: { start: number; end: number };
}

interface TimeseriesResponse {
  metric: string;
  granularity: string;
  period: { start: number; end: number };
  data: Array<{ bucket: string; value: number }>;
}

interface TagsAnalyticsResponse {
  period: { start: number; end: number };
  data: Array<{
    tag: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>;
}

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

interface ConversationCreatedResponse {
  id: string;
  project_id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Public Analytics API", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // GET /v1/analytics/summary
  // -------------------------------------------------------------------------

  describe("GET /v1/analytics/summary", () => {
    it("requires auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/summary");
      expect(res.status).toBe(401);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns summary with correct shape", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/summary", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(typeof body.total_conversations).toBe("number");
      expect(typeof body.total_messages).toBe("number");
      expect(typeof body.total_tokens).toBe("number");
      expect(typeof body.avg_messages_per_conversation).toBe("number");
      expect(typeof body.avg_tokens_per_conversation).toBe("number");
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
      expect(body.period.end).toBeGreaterThan(body.period.start);
    });

    it("respects date range filtering", async () => {
      const now = Date.now();
      const farFuture = now + 100 * 86_400_000;
      const evenFurtherFuture = farFuture + 86_400_000;

      // A range entirely in the future should return zero conversations
      const res = await SELF.fetch(
        `http://localhost/v1/analytics/summary?start=${farFuture}&end=${evenFurtherFuture}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBe(0);
      expect(body.period.start).toBe(farFuture);
      expect(body.period.end).toBe(evenFurtherFuture);
    });

    it("counts update after creating conversations", async () => {
      // Record baseline
      const baseRes = await SELF.fetch("http://localhost/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const base = await baseRes.json<SummaryResponse>();

      // Create a conversation with messages
      await createConversation({
        title: "Summary Count Test",
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi there!", token_count: 10 },
        ],
      });

      const afterRes = await SELF.fetch("http://localhost/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const after = await afterRes.json<SummaryResponse>();

      expect(after.total_conversations).toBe(base.total_conversations + 1);
      expect(after.total_messages).toBe(base.total_messages + 2);
      expect(after.total_tokens).toBe(base.total_tokens + 15);
    });

    it("filters by tag and returns only tagged conversations", async () => {
      // Create conversations — one tagged, one not
      const taggedRes = await createConversation({ title: "Tagged Summary Conv" });
      const tagged = await taggedRes.json<ConversationCreatedResponse>();
      await addTag(tagged.id, "summary-tag-test");

      await createConversation({ title: "Untagged Summary Conv" });

      // Get baseline for all
      const allRes = await SELF.fetch("http://localhost/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const all = await allRes.json<SummaryResponse>();

      // Get filtered by tag
      const filteredRes = await SELF.fetch(
        "http://localhost/v1/analytics/summary?tag=summary-tag-test",
        { headers: authHeaders() },
      );
      expect(filteredRes.status).toBe(200);

      const filtered = await filteredRes.json<SummaryResponse>();
      expect(filtered.total_conversations).toBeGreaterThanOrEqual(1);
      expect(filtered.total_conversations).toBeLessThan(all.total_conversations);
    });

    it("returns zero counts for non-existent tag", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/summary?tag=nonexistent-tag-xyz",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBe(0);
      expect(body.total_messages).toBe(0);
      expect(body.total_tokens).toBe(0);
    });

    it("computes avg_messages_per_conversation correctly", async () => {
      const now = Date.now();
      const start = now - 1000;
      const end = now + 86_400_000;

      // Create a conversation with known message counts
      await createConversation({
        title: "Avg Test Conv",
        messages: [
          { role: "user", content: "msg1", token_count: 10 },
          { role: "assistant", content: "msg2", token_count: 20 },
          { role: "user", content: "msg3", token_count: 5 },
        ],
      });

      const res = await SELF.fetch(
        `http://localhost/v1/analytics/summary?start=${start}&end=${end}`,
        { headers: authHeaders() },
      );
      const body = await res.json<SummaryResponse>();

      if (body.total_conversations > 0) {
        const expectedAvgMsgs =
          Math.round((body.total_messages / body.total_conversations) * 10) / 10;
        expect(body.avg_messages_per_conversation).toBe(expectedAvgMsgs);
      }
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/analytics/timeseries
  // -------------------------------------------------------------------------

  describe("GET /v1/analytics/timeseries", () => {
    it("requires auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/timeseries");
      expect(res.status).toBe(401);
    });

    it("returns daily granularity by default", async () => {
      // Create a conversation to ensure data exists
      await createConversation({ title: "Timeseries Daily Test" });

      const res = await SELF.fetch("http://localhost/v1/analytics/timeseries", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("conversations");
      expect(body.granularity).toBe("day");
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");

      // Each data point should have bucket (string) and value (number)
      for (const point of body.data) {
        expect(typeof point.bucket).toBe("string");
        expect(typeof point.value).toBe("number");
        // Day format: YYYY-MM-DD
        expect(point.bucket).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("supports weekly granularity", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?metric=conversations&granularity=week",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.granularity).toBe("week");

      for (const point of body.data) {
        // Week format: YYYY-Www
        expect(point.bucket).toMatch(/^\d{4}-W\d{2}$/);
      }
    });

    it("supports monthly granularity", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?metric=conversations&granularity=month",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.granularity).toBe("month");

      for (const point of body.data) {
        // Month format: YYYY-MM
        expect(point.bucket).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it("supports messages metric", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?metric=messages",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("messages");
      expect(Array.isArray(body.data)).toBe(true);

      for (const point of body.data) {
        expect(point.value).toBeGreaterThanOrEqual(0);
      }
    });

    it("supports tokens metric", async () => {
      await createConversation({
        title: "Tokens Timeseries",
        messages: [{ role: "user", content: "hello", token_count: 50 }],
      });

      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?metric=tokens",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("tokens");
      expect(Array.isArray(body.data)).toBe(true);

      const totalTokens = body.data.reduce((sum, p) => sum + p.value, 0);
      expect(totalTokens).toBeGreaterThanOrEqual(0);
    });

    it("falls back to conversations metric for invalid metric param", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?metric=invalid",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("conversations");
    });

    it("falls back to day granularity for invalid granularity param", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?granularity=invalid",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.granularity).toBe("day");
    });

    it("filters by tag", async () => {
      const convRes = await createConversation({ title: "Timeseries Tag Filter" });
      const conv = await convRes.json<ConversationCreatedResponse>();
      await addTag(conv.id, "ts-tag-filter");

      const res = await SELF.fetch(
        "http://localhost/v1/analytics/timeseries?tag=ts-tag-filter",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(Array.isArray(body.data)).toBe(true);

      // Total sum of filtered timeseries should reflect at least the conv we created
      const total = body.data.reduce((sum, p) => sum + p.value, 0);
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it("returns empty data array for future date range", async () => {
      const future = Date.now() + 100 * 86_400_000;
      const res = await SELF.fetch(
        `http://localhost/v1/analytics/timeseries?start=${future}&end=${future + 86_400_000}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.data).toEqual([]);
    });

    it("echoes back the period in response", async () => {
      const start = Date.now() - 7 * 86_400_000;
      const end = Date.now();

      const res = await SELF.fetch(
        `http://localhost/v1/analytics/timeseries?start=${start}&end=${end}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.period.start).toBe(start);
      expect(body.period.end).toBe(end);
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/analytics/tags
  // -------------------------------------------------------------------------

  describe("GET /v1/analytics/tags", () => {
    it("requires auth", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/tags");
      expect(res.status).toBe(401);
    });

    it("returns correct response shape", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsAnalyticsResponse>();
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
    });

    it("returns tag breakdown after adding tags", async () => {
      const tagName = `breakdown-tag-${Date.now()}`;

      // Create conversations with tags
      const convRes1 = await createConversation({
        title: "Tags Breakdown 1",
        messages: [{ role: "user", content: "msg", token_count: 100 }],
      });
      const conv1 = await convRes1.json<ConversationCreatedResponse>();
      await addTag(conv1.id, tagName);

      const convRes2 = await createConversation({
        title: "Tags Breakdown 2",
        messages: [
          { role: "user", content: "msg", token_count: 50 },
          { role: "assistant", content: "reply", token_count: 75 },
        ],
      });
      const conv2 = await convRes2.json<ConversationCreatedResponse>();
      await addTag(conv2.id, tagName);

      const res = await SELF.fetch("http://localhost/v1/analytics/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsAnalyticsResponse>();
      const tagRow = body.data.find((d) => d.tag === tagName);
      expect(tagRow).toBeDefined();
      expect(tagRow?.conversation_count).toBe(2);
      expect(tagRow?.message_count).toBe(3); // 1 + 2
      expect(tagRow?.token_count).toBe(225); // 100 + 50 + 75
    });

    it("respects limit param", async () => {
      // Add enough tags to exceed the limit
      for (let i = 0; i < 5; i++) {
        const convRes = await createConversation({ title: `Limit Test Conv ${i}` });
        const conv = await convRes.json<ConversationCreatedResponse>();
        await addTag(conv.id, `limit-tag-${i}-${Date.now()}`);
      }

      const res = await SELF.fetch("http://localhost/v1/analytics/tags?limit=2", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsAnalyticsResponse>();
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it("orders by conversation_count desc", async () => {
      const highTag = `high-count-${Date.now()}`;
      const lowTag = `low-count-${Date.now()}`;

      // Add highTag to 2 conversations
      for (let i = 0; i < 2; i++) {
        const convRes = await createConversation({ title: `High Tag Conv ${i}` });
        const conv = await convRes.json<ConversationCreatedResponse>();
        await addTag(conv.id, highTag);
      }

      // Add lowTag to 1 conversation
      const convRes = await createConversation({ title: "Low Tag Conv" });
      const conv = await convRes.json<ConversationCreatedResponse>();
      await addTag(conv.id, lowTag);

      const res = await SELF.fetch("http://localhost/v1/analytics/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsAnalyticsResponse>();

      const highIdx = body.data.findIndex((d) => d.tag === highTag);
      const lowIdx = body.data.findIndex((d) => d.tag === lowTag);

      if (highIdx !== -1 && lowIdx !== -1) {
        expect(highIdx).toBeLessThan(lowIdx);
      }

      // Verify descending order of all returned entries
      for (let i = 1; i < body.data.length; i++) {
        expect(body.data[i].conversation_count).toBeLessThanOrEqual(
          body.data[i - 1].conversation_count,
        );
      }
    });

    it("respects date range — returns empty for future range", async () => {
      const future = Date.now() + 100 * 86_400_000;
      const res = await SELF.fetch(
        `http://localhost/v1/analytics/tags?start=${future}&end=${future + 86_400_000}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<TagsAnalyticsResponse>();
      expect(body.data).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // GET /v1/conversations/:id/analytics
  // -------------------------------------------------------------------------

  describe("GET /v1/conversations/:id/analytics", () => {
    it("requires auth", async () => {
      const convRes = await createConversation({ title: "Auth Test" });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent conversation", async () => {
      const res = await SELF.fetch(
        "http://localhost/v1/conversations/nonexistent_id_xyz/analytics",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(404);

      const body = await res.json<{ error: { code: string } }>();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns correct analytics shape", async () => {
      const convRes = await createConversation({
        title: "Analytics Shape Test",
        messages: [{ role: "user", content: "Hello", token_count: 7 }],
      });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.conversation_id).toBe(conv.id);
      expect(body.title).toBe("Analytics Shape Test");
      expect(typeof body.message_count).toBe("number");
      expect(typeof body.token_count).toBe("number");
      expect(Array.isArray(body.tags)).toBe(true);
      expect(typeof body.duration_ms).toBe("number");
      expect(typeof body.messages_by_role).toBe("object");
      expect(typeof body.created_at).toBe("number");
      expect(typeof body.updated_at).toBe("number");
    });

    it("includes messages_by_role breakdown", async () => {
      const convRes = await createConversation({
        title: "Role Breakdown Test",
        messages: [
          { role: "user", content: "msg1", token_count: 10 },
          { role: "user", content: "msg2", token_count: 15 },
          { role: "assistant", content: "reply1", token_count: 30 },
          { role: "assistant", content: "reply2", token_count: 20 },
        ],
      });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.messages_by_role.user).toBeDefined();
      expect(body.messages_by_role.user.count).toBe(2);
      expect(body.messages_by_role.user.tokens).toBe(25);
      expect(body.messages_by_role.assistant).toBeDefined();
      expect(body.messages_by_role.assistant.count).toBe(2);
      expect(body.messages_by_role.assistant.tokens).toBe(50);
    });

    it("includes tags", async () => {
      const convRes = await createConversation({ title: "Tagged Analytics Test" });
      const conv = await convRes.json<ConversationCreatedResponse>();

      await addTag(conv.id, "analytics-tag-one");
      await addTag(conv.id, "analytics-tag-two");

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.tags).toContain("analytics-tag-one");
      expect(body.tags).toContain("analytics-tag-two");
      expect(body.tags.length).toBe(2);
    });

    it("calculates duration_ms as updated_at minus created_at", async () => {
      const convRes = await createConversation({ title: "Duration Test" });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.duration_ms).toBe(body.updated_at - body.created_at);
      expect(body.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("returns zero token_count and empty role breakdown for conversations without messages", async () => {
      const convRes = await createConversation({ title: "Empty Conv" });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.message_count).toBe(0);
      expect(body.token_count).toBe(0);
      expect(Object.keys(body.messages_by_role).length).toBe(0);
    });

    it("reflects correct message_count and token_count from conversation", async () => {
      const convRes = await createConversation({
        title: "Count Accuracy Test",
        messages: [
          { role: "user", content: "q1", token_count: 3 },
          { role: "assistant", content: "a1", token_count: 7 },
          { role: "user", content: "q2", token_count: 4 },
        ],
      });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<ConversationAnalyticsResponse>();
      expect(body.message_count).toBe(3);
      expect(body.token_count).toBe(14);
    });

    it("is accessible via /api/v1 prefix", async () => {
      const convRes = await createConversation({ title: "API Prefix Test" });
      const conv = await convRes.json<ConversationCreatedResponse>();

      const res = await SELF.fetch(
        `http://localhost/api/v1/conversations/${conv.id}/analytics`,
        { headers: authHeaders() },
      );
      // Both /v1 and /api/v1 are valid; /api/v1/conversations is also registered
      // so this should return 200
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Additional: /api/v1/analytics also works (backward compat prefix)
  // -------------------------------------------------------------------------

  describe("GET /api/v1/analytics/summary (api prefix)", () => {
    it("works with /api/v1 prefix", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/summary", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(typeof body.total_conversations).toBe("number");
    });
  });
});
