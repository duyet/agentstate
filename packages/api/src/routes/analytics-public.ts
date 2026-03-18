import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, conversationTags } from "../db/schema";
import { deprecationMiddleware } from "../lib/deprecation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Cache TTL values (in seconds)
const CACHE_TTL_SHORT = 60; // 1 minute - for short time ranges
const CACHE_TTL_MEDIUM = 180; // 3 minutes - for medium time ranges
const CACHE_TTL_LONG = 300; // 5 minutes - for long time ranges

app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// V1 deprecation notice
app.use("*", deprecationMiddleware({
  message: "API v1 is deprecated. Use /api/v2/ instead.",
  sunsetDate: "2026-12-31",
  link: "https://docs.agentstate.app/api/v2/migration",
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple string hash for cache key components. */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/** Get TTL based on time range - shorter ranges get shorter cache times. */
function getTtlForPeriod(start: number, end: number): number {
  const days = (end - start) / 86_400_000;
  if (days <= 1) return CACHE_TTL_SHORT;
  if (days <= 7) return CACHE_TTL_SHORT;
  if (days <= 30) return CACHE_TTL_MEDIUM;
  return CACHE_TTL_LONG;
}

/** Parse unix-ms timestamp from query string, returning undefined if absent or invalid. */
function parseTimestamp(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Default period: last 30 days. Returns [start, end]. */
function defaultPeriod(): [number, number] {
  const end = Date.now();
  const start = end - 30 * 86_400_000;
  return [start, end];
}

/**
 * Build conditions array for filtering conversations by project, optional date
 * range, and optional tag(s).  Returns both the WHERE conditions and the
 * resolved [start, end] period so callers can echo it in the response.
 */
async function buildFilters(
  db: Variables["db"],
  projectId: string,
  startParam: string | undefined,
  endParam: string | undefined,
  tags: string[] | undefined,
): Promise<{
  /** Final WHERE conditions, already including tag subquery filter when applicable. */
  conditions: ReturnType<typeof and>[];
  start: number;
  end: number;
  /** true when a tag filter was requested but no conversations matched — skip the main query */
  emptyResult: boolean;
}> {
  const [defaultStart, defaultEnd] = defaultPeriod();
  const start = parseTimestamp(startParam) ?? defaultStart;
  const end = parseTimestamp(endParam) ?? defaultEnd;

  const baseConditions: ReturnType<typeof and>[] = [
    eq(conversations.projectId, projectId),
    gte(conversations.createdAt, start),
    lte(conversations.createdAt, end),
  ];

  if (tags && tags.length > 0) {
    // Find conversation_ids that have ALL specified tags
    const rows = await db
      .select({ conversationId: conversationTags.conversationId })
      .from(conversationTags)
      .where(inArray(conversationTags.tag, tags))
      .groupBy(conversationTags.conversationId)
      .having(sql`COUNT(DISTINCT ${conversationTags.tag}) = ${tags.length}`);

    if (rows.length === 0) {
      return { conditions: baseConditions, start, end, emptyResult: true };
    }

    return {
      conditions: [
        ...baseConditions,
        inArray(
          conversations.id,
          rows.map((r) => r.conversationId),
        ),
      ],
      start,
      end,
      emptyResult: false,
    };
  }

  return { conditions: baseConditions, start, end, emptyResult: false };
}

// ---------------------------------------------------------------------------
// GET /summary
// ---------------------------------------------------------------------------

app.get("/summary", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const tags = c.req.queries("tag");
  const { conditions, start, end, emptyResult } = await buildFilters(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    tags,
  );

  // Build cache key components
  const tagsHash = tags && tags.length > 0 ? hashString(tags.sort().join(",")) : "none";
  const cacheKey = `analytics:summary:${projectId}:${start}:${end}:${tagsHash}`;
  const ttl = getTtlForPeriod(start, end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // When tag filter is active and no conversations matched, short-circuit with zeros
  if (emptyResult) {
    const result = {
      total_conversations: 0,
      total_messages: 0,
      total_tokens: 0,
      avg_messages_per_conversation: 0,
      avg_tokens_per_conversation: 0,
      period: { start, end },
    };
    // Cache the empty result
    if (c.env.AUTH_CACHE) {
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
      );
    }
    return c.json(result);
  }

  const [row] = await db
    .select({
      total_conversations: sql<number>`COUNT(*)`,
      total_messages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
      total_tokens: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`,
    })
    .from(conversations)
    .where(and(...conditions));

  const totalConvs = row?.total_conversations ?? 0;
  const totalMsgs = row?.total_messages ?? 0;
  const totalTokens = row?.total_tokens ?? 0;

  const result = {
    total_conversations: totalConvs,
    total_messages: totalMsgs,
    total_tokens: totalTokens,
    avg_messages_per_conversation:
      totalConvs > 0 ? Math.round((totalMsgs / totalConvs) * 10) / 10 : 0,
    avg_tokens_per_conversation:
      totalConvs > 0 ? Math.round((totalTokens / totalConvs) * 10) / 10 : 0,
    period: { start, end },
  };

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /timeseries
// ---------------------------------------------------------------------------

const VALID_METRICS = ["conversations", "messages", "tokens"] as const;
const VALID_GRANULARITIES = ["day", "week", "month"] as const;

type Metric = (typeof VALID_METRICS)[number];
type Granularity = (typeof VALID_GRANULARITIES)[number];

function bucketExpression(granularity: Granularity): ReturnType<typeof sql> {
  switch (granularity) {
    case "day":
      return sql<string>`date(${conversations.createdAt} / 1000, 'unixepoch')`;
    case "week":
      return sql<string>`strftime('%Y-W%W', ${conversations.createdAt} / 1000, 'unixepoch')`;
    case "month":
      return sql<string>`strftime('%Y-%m', ${conversations.createdAt} / 1000, 'unixepoch')`;
  }
}

app.get("/timeseries", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const metricParam = c.req.query("metric") ?? "conversations";
  const granularityParam = c.req.query("granularity") ?? "day";

  const metric: Metric = VALID_METRICS.includes(metricParam as Metric)
    ? (metricParam as Metric)
    : "conversations";
  const granularity: Granularity = VALID_GRANULARITIES.includes(granularityParam as Granularity)
    ? (granularityParam as Granularity)
    : "day";

  const tags = c.req.queries("tag");
  const { conditions, start, end, emptyResult } = await buildFilters(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    tags,
  );

  // Build cache key components
  const tagsHash = tags && tags.length > 0 ? hashString(tags.sort().join(",")) : "none";
  const cacheKey = `analytics:timeseries:${projectId}:${metric}:${granularity}:${start}:${end}:${tagsHash}`;
  const ttl = getTtlForPeriod(start, end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  if (emptyResult) {
    const result = { metric, granularity, period: { start, end }, data: [] };
    // Cache the empty result
    if (c.env.AUTH_CACHE) {
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
      );
    }
    return c.json(result);
  }

  const bucket = bucketExpression(granularity);

  let valueExpr: ReturnType<typeof sql>;
  switch (metric) {
    case "conversations":
      valueExpr = sql<number>`COUNT(*)`;
      break;
    case "messages":
      valueExpr = sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`;
      break;
    case "tokens":
      valueExpr = sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`;
      break;
  }

  const rows = await db
    .select({
      bucket: bucket.as("bucket"),
      value: valueExpr.as("value"),
    })
    .from(conversations)
    .where(and(...conditions))
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`);

  const result = {
    metric,
    granularity,
    period: { start, end },
    data: rows,
  };

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /tags
// ---------------------------------------------------------------------------

app.get("/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const [defaultStart, defaultEnd] = defaultPeriod();
  const start = parseTimestamp(c.req.query("start")) ?? defaultStart;
  const end = parseTimestamp(c.req.query("end")) ?? defaultEnd;

  const limitRaw = parseInt(c.req.query("limit") ?? "50", 10);
  const limit = Number.isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(limitRaw, 200);

  // Build cache key
  const cacheKey = `analytics:tags:${projectId}:${start}:${end}:${limit}`;
  const ttl = getTtlForPeriod(start, end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  const rows = await db
    .select({
      tag: conversationTags.tag,
      conversation_count: sql<number>`COUNT(DISTINCT ${conversationTags.conversationId})`.as(
        "conversation_count",
      ),
      message_count: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`.as(
        "message_count",
      ),
      token_count: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`.as("token_count"),
    })
    .from(conversationTags)
    .innerJoin(conversations, eq(conversations.id, conversationTags.conversationId))
    .where(
      and(
        eq(conversations.projectId, projectId),
        gte(conversations.createdAt, start),
        lte(conversations.createdAt, end),
      ),
    )
    .groupBy(conversationTags.tag)
    .orderBy(sql`COUNT(DISTINCT ${conversationTags.conversationId}) DESC`)
    .limit(limit);

  const result = {
    period: { start, end },
    data: rows,
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
