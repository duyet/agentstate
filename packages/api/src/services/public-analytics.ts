import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, conversationTags } from "../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Cache TTL values (in seconds)
const CACHE_TTL_SHORT = 60; // 1 minute - for short time ranges
const CACHE_TTL_MEDIUM = 180; // 3 minutes - for medium time ranges
const CACHE_TTL_LONG = 300; // 5 minutes - for long time ranges

const VALID_METRICS = ["conversations", "messages", "tokens"] as const;
const VALID_GRANULARITIES = ["day", "week", "month"] as const;

export type Metric = (typeof VALID_METRICS)[number];
export type Granularity = (typeof VALID_GRANULARITIES)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterResult {
  /** Final WHERE conditions, already including tag subquery filter when applicable. */
  conditions: ReturnType<typeof and>[];
  start: number;
  end: number;
  /** true when a tag filter was requested but no conversations matched — skip the main query */
  emptyResult: boolean;
}

export interface CacheConfig {
  key: string;
  ttl: number;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Simple string hash for cache key components. */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/** Get TTL based on time range - shorter ranges get shorter cache times. */
export function getTtlForPeriod(start: number, end: number): number {
  const days = (end - start) / 86_400_000;
  if (days <= 1) return CACHE_TTL_SHORT;
  if (days <= 7) return CACHE_TTL_SHORT;
  if (days <= 30) return CACHE_TTL_MEDIUM;
  return CACHE_TTL_LONG;
}

/** Parse unix-ms timestamp from query string, returning undefined if absent or invalid. */
export function parseTimestamp(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Default period: last 30 days. Returns [start, end]. */
export function defaultPeriod(): [number, number] {
  const end = Date.now();
  const start = end - 30 * 86_400_000;
  return [start, end];
}

/**
 * Build conditions array for filtering conversations by project, optional date
 * range, and optional tag(s).  Returns both the WHERE conditions and the
 * resolved [start, end] period so callers can echo it in the response.
 */
export async function buildFilters(
  db: DrizzleD1Database,
  projectId: string,
  startParam: string | undefined,
  endParam: string | undefined,
  tags: string[] | undefined,
): Promise<FilterResult> {
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

/** Build cache key and TTL for analytics endpoints. */
export function buildCacheConfig(
  endpoint: string,
  projectId: string,
  start: number,
  end: number,
  tags: string[] | undefined,
  extras: Record<string, string | number> = {},
): CacheConfig {
  const tagsHash = tags && tags.length > 0 ? hashString(tags.sort().join(",")) : "none";
  const extraParts = Object.entries(extras)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(":");
  const key = `analytics:${endpoint}:${projectId}:${start}:${end}:${tagsHash}${extraParts ? `:${extraParts}` : ""}`;
  const ttl = getTtlForPeriod(start, end);
  return { key, ttl };
}

/** Parse and validate metric parameter. */
export function parseMetric(raw: string | undefined): Metric {
  if (!raw) return "conversations";
  return VALID_METRICS.includes(raw as Metric) ? (raw as Metric) : "conversations";
}

/** Parse and validate granularity parameter. */
export function parseGranularity(raw: string | undefined): Granularity {
  if (!raw) return "day";
  return VALID_GRANULARITIES.includes(raw as Granularity) ? (raw as Granularity) : "day";
}

// ---------------------------------------------------------------------------
// Query Functions
// ---------------------------------------------------------------------------

/** Get bucket expression for time-series grouping. */
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

/** Get value expression for metric aggregation. */
function metricExpression(metric: Metric): ReturnType<typeof sql> {
  switch (metric) {
    case "conversations":
      return sql<number>`COUNT(*)`;
    case "messages":
      return sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`;
    case "tokens":
      return sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`;
  }
}

/** Execute summary query. */
export async function querySummary(
  db: DrizzleD1Database,
  conditions: ReturnType<typeof and>[],
): Promise<{
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
}> {
  const [row] = await db
    .select({
      total_conversations: sql<number>`COUNT(*)`,
      total_messages: sql<number>`COALESCE(SUM(${conversations.messageCount}), 0)`,
      total_tokens: sql<number>`COALESCE(SUM(${conversations.tokenCount}), 0)`,
    })
    .from(conversations)
    .where(and(...conditions));

  return {
    total_conversations: row?.total_conversations ?? 0,
    total_messages: row?.total_messages ?? 0,
    total_tokens: row?.total_tokens ?? 0,
  };
}

/** Execute timeseries query. */
export async function queryTimeseries(
  db: DrizzleD1Database,
  conditions: ReturnType<typeof and>[],
  metric: Metric,
  granularity: Granularity,
): Promise<Array<{ bucket: string; value: number }>> {
  const bucket = bucketExpression(granularity);
  const valueExpr = metricExpression(metric);

  const rows = await db
    .select({
      bucket: bucket.as("bucket"),
      value: valueExpr.as("value"),
    })
    .from(conversations)
    .where(and(...conditions))
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`);

  // Map to properly typed objects - Drizzle SQL expressions return unknown
  return rows.map((row) => ({
    bucket: String(row.bucket),
    value: Number(row.value),
  }));
}

/** Execute tags query. */
export async function queryTags(
  db: DrizzleD1Database,
  projectId: string,
  start: number,
  end: number,
  limit: number,
): Promise<
  Array<{
    tag: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>
> {
  return db
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
}

// ---------------------------------------------------------------------------
// Result Builders
// ---------------------------------------------------------------------------

/** Build summary response with averages calculated. */
export function buildSummaryResult(
  totals: Awaited<ReturnType<typeof querySummary>>,
  start: number,
  end: number,
) {
  const totalConvs = totals.total_conversations;
  const totalMsgs = totals.total_messages;
  const totalTokens = totals.total_tokens;

  return {
    total_conversations: totalConvs,
    total_messages: totalMsgs,
    total_tokens: totalTokens,
    avg_messages_per_conversation:
      totalConvs > 0 ? Math.round((totalMsgs / totalConvs) * 10) / 10 : 0,
    avg_tokens_per_conversation:
      totalConvs > 0 ? Math.round((totalTokens / totalConvs) * 10) / 10 : 0,
    period: { start, end },
  };
}

/** Build empty summary result for tag filter mismatches. */
export function buildEmptySummaryResult(start: number, end: number) {
  return {
    total_conversations: 0,
    total_messages: 0,
    total_tokens: 0,
    avg_messages_per_conversation: 0,
    avg_tokens_per_conversation: 0,
    period: { start, end },
  };
}

/** Build timeseries response structure. */
export function buildTimeseriesResult(
  metric: Metric,
  granularity: Granularity,
  start: number,
  end: number,
  data: Awaited<ReturnType<typeof queryTimeseries>>,
) {
  return {
    metric,
    granularity,
    period: { start, end },
    data,
  };
}

/** Build empty timeseries result for tag filter mismatches. */
export function buildEmptyTimeseriesResult(
  metric: Metric,
  granularity: Granularity,
  start: number,
  end: number,
) {
  return {
    metric,
    granularity,
    period: { start, end },
    data: [],
  };
}

/** Build tags response structure. */
export function buildTagsResult(
  start: number,
  end: number,
  data: Awaited<ReturnType<typeof queryTags>>,
) {
  return {
    period: { start, end },
    data,
  };
}

// ---------------------------------------------------------------------------
// Cache Handler
// ---------------------------------------------------------------------------

/**
 * Generic cache handler that attempts to fetch from cache, and if not found,
 * executes the query, caches the result, and returns it.
 *
 * @param cache - KV namespace or undefined
 * @param config - Cache configuration (key and TTL)
 * @param executor - Function that executes the query and returns the result
 * @param executionCtx - Hono execution context for async caching
 * @returns The cached or freshly fetched result
 */
export async function withCache<T>(
  cache: KVNamespace | undefined,
  config: CacheConfig,
  executor: () => Promise<T>,
  executionCtx: ExecutionContext,
): Promise<T> {
  // Try cache first
  if (cache) {
    const cached = await cache.get(config.key, "json");
    if (cached) {
      return cached as T;
    }
  }

  // Execute query
  const result = await executor();

  // Cache the result
  if (cache) {
    executionCtx.waitUntil(
      cache.put(config.key, JSON.stringify(result), { expirationTtl: config.ttl }),
    );
  }

  return result;
}

/**
 * Generic cache handler for endpoints that may return empty results.
 * When emptyResult is true, skips the query and returns a pre-built empty result.
 *
 * @param cache - KV namespace or undefined
 * @param config - Cache configuration (key and TTL)
 * @param emptyResult - Whether to return empty result
 * @param emptyBuilder - Function that builds the empty result
 * @param executor - Function that executes the query and returns the result
 * @param executionCtx - Hono execution context for async caching
 * @returns The cached or freshly fetched result
 */
export async function withCacheOrEmpty<T>(
  cache: KVNamespace | undefined,
  config: CacheConfig,
  emptyResult: boolean,
  emptyBuilder: () => T,
  executor: () => Promise<T>,
  executionCtx: ExecutionContext,
): Promise<T> {
  // Try cache first
  if (cache) {
    const cached = await cache.get(config.key, "json");
    if (cached) {
      return cached as T;
    }
  }

  // Return empty result if flag is set
  if (emptyResult) {
    const result = emptyBuilder();
    if (cache) {
      executionCtx.waitUntil(
        cache.put(config.key, JSON.stringify(result), { expirationTtl: config.ttl }),
      );
    }
    return result;
  }

  // Execute query
  const result = await executor();

  // Cache the result
  if (cache) {
    executionCtx.waitUntil(
      cache.put(config.key, JSON.stringify(result), { expirationTtl: config.ttl }),
    );
  }

  return result;
}
