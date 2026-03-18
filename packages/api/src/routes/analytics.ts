import { and, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../db/schema";
import { deprecationMiddleware } from "../lib/deprecation";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// V1 deprecation notice
app.use(
  "*",
  deprecationMiddleware({
    message: "API v1 is deprecated. Use /api/v2/analytics instead.",
    sunsetDate: "2026-12-31",
    link: "https://docs.agentstate.app/api/v2/migration",
  }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get TTL based on range - shorter ranges get shorter cache times. */
function getTtlForRange(range: string): number {
  const ttlMap: Record<string, number> = {
    "7d": 60,
    "30d": 180,
    "90d": 300,
  };
  return ttlMap[range] ?? 180;
}

// ---------------------------------------------------------------------------
// GET /v1/projects/:id/analytics — Usage analytics for a project
// ---------------------------------------------------------------------------

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

app.get("/:id/analytics", async (c) => {
  const db = c.get("db");
  const projectId = c.req.param("id");

  const rangeParam = c.req.query("range") ?? "30d";
  const days = RANGE_DAYS[rangeParam] ?? 30;
  const cutoff = Date.now() - days * 86_400_000;

  // Build cache key
  const cacheKey = `analytics:public:${projectId}:${rangeParam}`;
  const ttl = getTtlForRange(rangeParam);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // Cache miss - compute aggregations
  // Summary stats — single query with scalar subqueries
  const [summary] = await db
    .select({
      total_conversations: sql<number>`(SELECT COUNT(*) FROM conversations WHERE project_id = ${projectId})`,
      total_messages: sql<number>`(SELECT COALESCE(SUM(message_count), 0) FROM conversations WHERE project_id = ${projectId})`,
      total_tokens: sql<number>`(SELECT COALESCE(SUM(token_count), 0) FROM conversations WHERE project_id = ${projectId})`,
      active_api_keys: sql<number>`(SELECT COUNT(*) FROM api_keys WHERE project_id = ${projectId} AND revoked_at IS NULL)`,
    })
    .from(sql`(SELECT 1)`);

  // Conversations per day
  const conversationsPerDay = await db
    .select({
      date: sql<string>`date(${conversations.createdAt} / 1000, 'unixepoch')`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), gte(conversations.createdAt, cutoff)))
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  // Messages per day
  const messagesPerDay = await db
    .select({
      date: sql<string>`date(${messages.createdAt} / 1000, 'unixepoch')`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(conversations.projectId, projectId), gte(messages.createdAt, cutoff)))
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  // Tokens per day
  const tokensPerDay = await db
    .select({
      date: sql<string>`date(${messages.createdAt} / 1000, 'unixepoch')`.as("date"),
      total: sql<number>`COALESCE(SUM(${messages.tokenCount}), 0)`.as("total"),
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(conversations.projectId, projectId), gte(messages.createdAt, cutoff)))
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  // Recent conversations (last 10)
  const recent = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      message_count: conversations.messageCount,
      token_count: conversations.tokenCount,
      updated_at: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(sql`${conversations.updatedAt} DESC`)
    .limit(10);

  const result = {
    summary,
    conversations_per_day: conversationsPerDay,
    messages_per_day: messagesPerDay,
    tokens_per_day: tokensPerDay,
    recent_conversations: recent,
  };

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

export default app;
