import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";
import { conversations, conversationTags } from "../db/schema";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const DEFAULT_DAYS = 30;

const BaseQuerySchema = z.object({
  start: z.coerce.number().int().positive().optional(),
  end: z.coerce.number().int().positive().optional(),
});

const TimeseriesQuerySchema = BaseQuerySchema.extend({
  metric: z.enum(["conversations", "messages", "tokens"]).default("conversations"),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

const TagsQuerySchema = BaseQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultPeriod(start?: number, end?: number): { start: number; end: number } {
  const now = Date.now();
  return {
    start: start ?? now - DEFAULT_DAYS * 86_400_000,
    end: end ?? now,
  };
}

const BUCKET_EXPR: Record<"day" | "week" | "month", string> = {
  day: "date(created_at/1000, 'unixepoch')",
  week: "strftime('%Y-W%W', created_at/1000, 'unixepoch')",
  month: "strftime('%Y-%m', created_at/1000, 'unixepoch')",
};

type Metric = "conversations" | "messages" | "tokens";

const METRIC_EXPR: Record<Metric, ReturnType<typeof sql>> = {
  conversations: sql<number>`COUNT(*)`,
  messages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
  tokens: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`,
};

/**
 * Resolves a list of tags to matching conversation IDs within a project.
 * Uses AND semantics: all specified tags must be present on a conversation.
 * Returns null when no tags are specified (no filter needed).
 * Returns an empty array when tags are specified but no conversations match.
 */
async function resolveTagFilter(
  db: DrizzleD1Database,
  projectId: string,
  tags: string[] | undefined,
): Promise<string[] | null> {
  if (!tags || tags.length === 0) return null;

  const matches = await db
    .select({ conversationId: conversationTags.conversationId })
    .from(conversationTags)
    .innerJoin(conversations, eq(conversations.id, conversationTags.conversationId))
    .where(and(eq(conversations.projectId, projectId), inArray(conversationTags.tag, tags)))
    .groupBy(conversationTags.conversationId)
    .having(sql`COUNT(DISTINCT ${conversationTags.tag}) = ${tags.length}`);

  return matches.map((r) => r.conversationId);
}

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------

app.get("/summary", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const parsed = BaseQuerySchema.safeParse({
    start: c.req.query("start"),
    end: c.req.query("end"),
  });

  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid query parameters" } }, 400);
  }

  const period = defaultPeriod(parsed.data.start, parsed.data.end);
  const tagIds = await resolveTagFilter(db, projectId, c.req.queries("tag"));

  if (tagIds !== null && tagIds.length === 0) {
    return c.json({
      total_conversations: 0,
      total_messages: 0,
      total_tokens: 0,
      avg_messages_per_conversation: 0,
      avg_tokens_per_conversation: 0,
      period,
    });
  }

  const conditions = [
    eq(conversations.projectId, projectId),
    gte(conversations.createdAt, period.start),
    lte(conversations.createdAt, period.end),
    ...(tagIds !== null ? [inArray(conversations.id, tagIds)] : []),
  ];

  const [row] = await db
    .select({
      total_conversations: sql<number>`COUNT(*)`,
      total_messages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
      total_tokens: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`,
    })
    .from(conversations)
    .where(and(...conditions));

  const total = row.total_conversations ?? 0;
  const totalMessages = row.total_messages ?? 0;
  const totalTokens = row.total_tokens ?? 0;

  return c.json({
    total_conversations: total,
    total_messages: totalMessages,
    total_tokens: totalTokens,
    avg_messages_per_conversation: total > 0 ? Math.round((totalMessages / total) * 10) / 10 : 0,
    avg_tokens_per_conversation: total > 0 ? Math.round((totalTokens / total) * 10) / 10 : 0,
    period,
  });
});

// ---------------------------------------------------------------------------
// GET /timeseries
// ---------------------------------------------------------------------------

app.get("/timeseries", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const parsed = TimeseriesQuerySchema.safeParse({
    start: c.req.query("start"),
    end: c.req.query("end"),
    metric: c.req.query("metric"),
    granularity: c.req.query("granularity"),
  });

  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid query parameters" } }, 400);
  }

  const { metric, granularity } = parsed.data;
  const period = defaultPeriod(parsed.data.start, parsed.data.end);
  const tagIds = await resolveTagFilter(db, projectId, c.req.queries("tag"));

  if (tagIds !== null && tagIds.length === 0) {
    return c.json({ metric, granularity, period, data: [] });
  }

  const conditions = [
    eq(conversations.projectId, projectId),
    gte(conversations.createdAt, period.start),
    lte(conversations.createdAt, period.end),
    ...(tagIds !== null ? [inArray(conversations.id, tagIds)] : []),
  ];

  const bucketExpr = BUCKET_EXPR[granularity];
  const valueExpr = METRIC_EXPR[metric];

  const rows = await db
    .select({
      bucket: sql<string>`${sql.raw(bucketExpr)}`.as("bucket"),
      value: valueExpr.as("value"),
    })
    .from(conversations)
    .where(and(...conditions))
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`);

  return c.json({
    metric,
    granularity,
    period,
    data: rows,
  });
});

// ---------------------------------------------------------------------------
// GET /tags
// ---------------------------------------------------------------------------

app.get("/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const parsed = TagsQuerySchema.safeParse({
    start: c.req.query("start"),
    end: c.req.query("end"),
    limit: c.req.query("limit"),
  });

  if (!parsed.success) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid query parameters" } }, 400);
  }

  const { limit } = parsed.data;
  const period = defaultPeriod(parsed.data.start, parsed.data.end);

  const rows = await db
    .select({
      tag: conversationTags.tag,
      conversation_count: sql<number>`COUNT(DISTINCT ${conversations.id})`,
      message_count: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
      token_count: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`,
    })
    .from(conversationTags)
    .innerJoin(conversations, eq(conversations.id, conversationTags.conversationId))
    .where(
      and(
        eq(conversations.projectId, projectId),
        gte(conversations.createdAt, period.start),
        lte(conversations.createdAt, period.end),
      ),
    )
    .groupBy(conversationTags.tag)
    .orderBy(sql`COUNT(DISTINCT ${conversations.id}) DESC`)
    .limit(limit);

  return c.json({ period, data: rows });
});

export default app;
