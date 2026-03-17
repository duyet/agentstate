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

async function addTag(conversationId: string, tags: string[]) {
  return SELF.fetch(`http://localhost/v1/conversations/${conversationId}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ tags }),
  });
}

// ---------------------------------------------------------------------------
// Types
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

interface TagsResponse {
  period: { start: number; end: number };
  data: Array<{
    tag: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Public Analytics API", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();

    // Seed conversations with messages and tags for testing
    const c1Res = await createConversation({
      title: "Analytics Seed 1",
      messages: [
        { role: "user", content: "Hello", token_count: 10 },
        { role: "assistant", content: "Hi", token_count: 20 },
      ],
    });
    const c1 = await c1Res.json<{ id: string }>();
    await addTag(c1.id, ["support", "billing"]);

    const c2Res = await createConversation({
      title: "Analytics Seed 2",
      messages: [{ role: "user", content: "Help", token_count: 5 }],
    });
    const c2 = await c2Res.json<{ id: string }>();
    await addTag(c2.id, ["support"]);

    const c3Res = await createConversation({ title: "Analytics Seed 3" });
    const c3 = await c3Res.json<{ id: string }>();
    await addTag(c3.id, ["billing"]);
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/analytics/summary
  // -------------------------------------------------------------------------

  describe("GET /api/v1/analytics/summary", () => {
    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/summary");
      expect(res.status).toBe(401);
    });

    it("returns correct shape with defaults", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/summary", {
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
    });

    it("includes seeded conversations in total", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBeGreaterThanOrEqual(3);
    });

    it("counts messages and tokens", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const body = await res.json<SummaryResponse>();
      // Seeded: c1 has 30 tokens, c2 has 5 tokens — at least 35 total
      expect(body.total_tokens).toBeGreaterThanOrEqual(35);
      expect(body.total_messages).toBeGreaterThanOrEqual(3);
    });

    it("respects start/end range and returns empty for future-only range", async () => {
      const futureStart = Date.now() + 86_400_000 * 365;
      const futureEnd = futureStart + 86_400_000;
      const res = await SELF.fetch(
        `http://localhost/api/v1/analytics/summary?start=${futureStart}&end=${futureEnd}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBe(0);
    });

    it("filters by single tag", async () => {
      const allRes = await SELF.fetch("http://localhost/api/v1/analytics/summary", {
        headers: authHeaders(),
      });
      const all = await allRes.json<SummaryResponse>();

      const tagRes = await SELF.fetch("http://localhost/api/v1/analytics/summary?tag=support", {
        headers: authHeaders(),
      });
      expect(tagRes.status).toBe(200);
      const tagged = await tagRes.json<SummaryResponse>();

      // Only c1 and c2 have 'support' tag (seeded above)
      expect(tagged.total_conversations).toBeGreaterThanOrEqual(2);
      expect(tagged.total_conversations).toBeLessThanOrEqual(all.total_conversations);
    });

    it("filters by multiple tags (AND semantics)", async () => {
      // Only c1 has both 'support' AND 'billing'
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/summary?tag=support&tag=billing",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBeGreaterThanOrEqual(1);

      // Must be less than or equal to single-tag filter count
      const singleTagRes = await SELF.fetch(
        "http://localhost/api/v1/analytics/summary?tag=support",
        { headers: authHeaders() },
      );
      const singleTag = await singleTagRes.json<SummaryResponse>();
      expect(body.total_conversations).toBeLessThanOrEqual(singleTag.total_conversations);
    });

    it("returns zeros when tag matches no conversations", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/summary?tag=nonexistent-tag-xyz",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<SummaryResponse>();
      expect(body.total_conversations).toBe(0);
      expect(body.total_messages).toBe(0);
      expect(body.total_tokens).toBe(0);
    });

    it("returns 400 for invalid start param", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/summary?start=not-a-number",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(400);
    });

    it("also works at /v1/analytics/summary (backward compat)", async () => {
      const res = await SELF.fetch("http://localhost/v1/analytics/summary", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/analytics/timeseries
  // -------------------------------------------------------------------------

  describe("GET /api/v1/analytics/timeseries", () => {
    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/timeseries");
      expect(res.status).toBe(401);
    });

    it("returns correct shape with defaults", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/timeseries", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("conversations");
      expect(body.granularity).toBe("day");
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns data points with bucket and value", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/timeseries", {
        headers: authHeaders(),
      });
      const body = await res.json<TimeseriesResponse>();

      // Seeded conversations → at least one day bucket
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      for (const point of body.data) {
        expect(typeof point.bucket).toBe("string");
        expect(typeof point.value).toBe("number");
      }
    });

    it("supports metric=messages", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/timeseries?metric=messages", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("messages");
    });

    it("supports metric=tokens", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/timeseries?metric=tokens", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<TimeseriesResponse>();
      expect(body.metric).toBe("tokens");
    });

    it("supports granularity=week", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/timeseries?granularity=week",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<TimeseriesResponse>();
      expect(body.granularity).toBe("week");
    });

    it("supports granularity=month", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/timeseries?granularity=month",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<TimeseriesResponse>();
      expect(body.granularity).toBe("month");
    });

    it("returns empty data for future range", async () => {
      const futureStart = Date.now() + 86_400_000 * 365;
      const futureEnd = futureStart + 86_400_000;
      const res = await SELF.fetch(
        `http://localhost/api/v1/analytics/timeseries?start=${futureStart}&end=${futureEnd}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<TimeseriesResponse>();
      expect(body.data).toHaveLength(0);
    });

    it("filters by tag", async () => {
      const allRes = await SELF.fetch("http://localhost/api/v1/analytics/timeseries", {
        headers: authHeaders(),
      });
      const all = await allRes.json<TimeseriesResponse>();
      const allTotal = all.data.reduce((s, d) => s + d.value, 0);

      const tagRes = await SELF.fetch(
        "http://localhost/api/v1/analytics/timeseries?tag=billing",
        { headers: authHeaders() },
      );
      expect(tagRes.status).toBe(200);
      const tagged = await tagRes.json<TimeseriesResponse>();
      const taggedTotal = tagged.data.reduce((s, d) => s + d.value, 0);

      expect(taggedTotal).toBeLessThanOrEqual(allTotal);
    });

    it("returns 400 for invalid metric", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/timeseries?metric=invalid",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid granularity", async () => {
      const res = await SELF.fetch(
        "http://localhost/api/v1/analytics/timeseries?granularity=hour",
        { headers: authHeaders() },
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/analytics/tags
  // -------------------------------------------------------------------------

  describe("GET /api/v1/analytics/tags", () => {
    it("returns 401 without auth", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags");
      expect(res.status).toBe(401);
    });

    it("returns correct shape with defaults", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const body = await res.json<TagsResponse>();
      expect(typeof body.period.start).toBe("number");
      expect(typeof body.period.end).toBe("number");
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns tag stats with correct fields", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags", {
        headers: authHeaders(),
      });
      const body = await res.json<TagsResponse>();

      expect(body.data.length).toBeGreaterThanOrEqual(1);
      for (const row of body.data) {
        expect(typeof row.tag).toBe("string");
        expect(typeof row.conversation_count).toBe("number");
        expect(typeof row.message_count).toBe("number");
        expect(typeof row.token_count).toBe("number");
        expect(row.conversation_count).toBeGreaterThanOrEqual(1);
      }
    });

    it("includes seeded tags in results", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags", {
        headers: authHeaders(),
      });
      const body = await res.json<TagsResponse>();
      const tagNames = body.data.map((r) => r.tag);

      expect(tagNames).toContain("support");
      expect(tagNames).toContain("billing");
    });

    it("orders by conversation_count descending", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags", {
        headers: authHeaders(),
      });
      const body = await res.json<TagsResponse>();

      if (body.data.length > 1) {
        for (let i = 1; i < body.data.length; i++) {
          expect(body.data[i].conversation_count).toBeLessThanOrEqual(
            body.data[i - 1].conversation_count,
          );
        }
      }
    });

    it("respects limit param", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags?limit=1", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = await res.json<TagsResponse>();
      expect(body.data.length).toBeLessThanOrEqual(1);
    });

    it("returns 400 when limit exceeds 200", async () => {
      const res = await SELF.fetch("http://localhost/api/v1/analytics/tags?limit=201", {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
    });

    it("returns empty data for future range", async () => {
      const futureStart = Date.now() + 86_400_000 * 365;
      const futureEnd = futureStart + 86_400_000;
      const res = await SELF.fetch(
        `http://localhost/api/v1/analytics/tags?start=${futureStart}&end=${futureEnd}`,
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json<TagsResponse>();
      expect(body.data).toHaveLength(0);
    });
  });
});
