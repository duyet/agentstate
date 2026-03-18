import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_PROJECT_ID } from "./setup";

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface SummaryResponse {
  project_id: string;
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  avg_messages_per_conversation: number;
  avg_tokens_per_conversation: number;
  period: { start: number; end: number };
}

interface TimeseriesResponse {
  project_id: string;
  metric: string;
  granularity: string;
  period: { start: number; end: number };
  data: Array<{ bucket: string; value: number }>;
}

interface TagsResponse {
  project_id: string;
  period: { start: number; end: number };
  data: Array<{
    tag: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConversation(body: Record<string, unknown> = {}) {
  const res = await SELF.fetch("http://localhost/api/v2/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return res;
}

async function addTag(conversationId: string, tag: string) {
  // Note: Tags endpoint is currently V1 only
  const res = await SELF.fetch(`http://localhost/api/v1/conversations/${conversationId}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ tags: [tag] }),
  });
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("V2 Analytics", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  // -------------------------------------------------------------------------
  // GET /summary - Usage summary
  // -------------------------------------------------------------------------

  describe("GET /api/v2/analytics/summary", () => {
    it("returns summary stats for the project", async () => {
      // Create test conversations
      await createConversation({
        messages: [
          { role: "user", content: "Hello", token_count: 5 },
          { role: "assistant", content: "Hi", token_count: 3 },
        ],
      });
      await createConversation({
        messages: [{ role: "user", content: "Test", token_count: 10 }],
      });

      const res = await SELF.fetch("http://localhost/api/v2/analytics/summary", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.total_conversations).toBeGreaterThanOrEqual(2);
      expect(body.total_messages).toBeGreaterThanOrEqual(3);
      expect(body.total_tokens).toBeGreaterThanOrEqual(18);
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
      expect("id" in body).toBe(false); // V2 uses project_id, not id
    });

    it("supports custom start/end timestamps", async () => {
      const now = Date.now();
      const start = now - 86_400_000; // 1 day ago
      const end = now;

      const res = await SELF.fetch(
        `http://localhost/api/v2/analytics/summary?start=${start}&end=${end}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(body.period.start).toBe(start);
      expect(body.period.end).toBe(end);
    });

    it("supports tag filtering", async () => {
      // Create conversations with specific tags
      const res1 = await createConversation({
        messages: [{ role: "user", content: "Tagged message 1", token_count: 5 }],
      });
      const conv1 = await res1.json<{ id: string }>();
      await addTag(conv1.id, "test-tag");

      const res2 = await createConversation({
        messages: [{ role: "user", content: "Tagged message 2", token_count: 7 }],
      });
      const conv2 = await res2.json<{ id: string }>();
      await addTag(conv2.id, "test-tag");

      // Query with tag filter
      const res = await SELF.fetch("http://localhost/api/v2/analytics/summary?tag=test-tag", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBeGreaterThanOrEqual(2);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/analytics/summary");
      expect(res.status).toBe(401);
    });

    it("does NOT have deprecation headers", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/analytics/summary", {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toBeNull();
      expect(res.headers.get("Sunset")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET /timeseries - Time-series data
  // -------------------------------------------------------------------------

  describe("GET /api/v2/analytics/timeseries", () => {
    it("returns timeseries data for conversations", async () => {
      await createConversation({
        messages: [{ role: "user", content: "Time series test", token_count: 5 }],
      });

      const res = await SELF.fetch("http://localhost/api/v2/analytics/timeseries", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(body.metric).toBe("conversations");
      expect(body.granularity).toBe("day");
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("supports different metrics", async () => {
      const metrics = ["conversations", "messages", "tokens"] as const;

      for (const metric of metrics) {
        const res = await SELF.fetch(
          `http://localhost/api/v2/analytics/timeseries?metric=${metric}`,
          { headers: authHeaders() },
        );
        expect(res.status).toBe(200);

        const body = await res.json<TimeseriesResponse>();
        expect(body.metric).toBe(metric);
      }
    });

    it("supports different granularities", async () => {
      const granularities = ["day", "week", "month"] as const;

      for (const granularity of granularities) {
        const res = await SELF.fetch(
          `http://localhost/api/v2/analytics/timeseries?granularity=${granularity}`,
          { headers: authHeaders() },
        );
        expect(res.status).toBe(200);

        const body = await res.json<TimeseriesResponse>();
        expect(body.granularity).toBe(granularity);
      }
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/analytics/timeseries");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /tags - Tag usage analytics
  // -------------------------------------------------------------------------

  describe("GET /api/v2/analytics/tags", () => {
    it("returns tag usage statistics", async () => {
      // Create conversations with tags
      const res1 = await createConversation({
        messages: [{ role: "user", content: "Tag test", token_count: 5 }],
      });
      const conv1 = await res1.json<{ id: string }>();
      await addTag(conv1.id, "analytics-test");

      const res = await SELF.fetch("http://localhost/api/v2/analytics/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(body.project_id).toBe(TEST_PROJECT_ID);
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
    });

    it("supports limit parameter", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/analytics/tags?limit=5", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v2/analytics/tags");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // V1 deprecation headers
  // -------------------------------------------------------------------------

  describe("V1 Deprecation Headers", () => {
    it("adds deprecation headers to V1 analytics endpoints", async () => {
      const res = await SELF.fetch(`http://localhost/v1/projects/${TEST_PROJECT_ID}/analytics`, {
        headers: authHeaders(),
      });
      expect(res.headers.get("X-API-Deprecation")).toContain("deprecated");
      expect(res.headers.get("Sunset")).toBe("2026-12-31");
      expect(res.headers.get("Link")).toContain("deprecation");
    });
  });
});
