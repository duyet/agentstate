// ---------------------------------------------------------------------------
// Analytics service — Business logic for usage analytics and metrics
// ---------------------------------------------------------------------------

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, conversationTags } from "../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache TTL values (in seconds) */
const CACHE_TTL_SHORT = 60; // 1 minute - for short time ranges
const CACHE_TTL_MEDIUM = 180; // 3 minutes - for medium time ranges
const CACHE_TTL_LONG = 300; // 5 minutes - for long time ranges

/** Valid metric types for timeseries */
export const VALID_METRICS = ["conversations", "messages", "tokens"] as const;
/** Valid granularity options for timeseries */
export const VALID_GRANULARITIES = ["day", "week", "month"] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Metric = (typeof VALID_METRICS)[number];
export type Granularity = (typeof VALID_GRANULARITIES)[number];

export interface AnalyticsPeriod {
  start: number;
  end: number;
}

export interface AnalyticsFilters {
  conditions: ReturnType<typeof and>[];
  period: AnalyticsPeriod;
  emptyResult: boolean;
}

export interface SummaryResult {
  project_id: string;
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  avg_messages_per_conversation: number;
  avg_tokens_per_conversation: number;
  period: AnalyticsPeriod;
}

export interface TimeseriesResult {
  project_id: string;
  metric: Metric;
  granularity: Granularity;
  period: AnalyticsPeriod;
  data: Array<{ bucket: unknown; value: unknown }>;
}

export interface TagAnalyticsResult {
  project_id: string;
  period: AnalyticsPeriod;
  data: Array<{
    tag: string;
    conversation_count: number;
    message_count: number;
    token_count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Simple string hash for cache key components.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get TTL based on time range - shorter ranges get shorter cache times.
 */
export function getTtlForPeriod(start: number, end: number): number {
  const days = (end - start) / 86_400_000;
  if (days <= 1) return CACHE_TTL_SHORT;
  if (days <= 7) return CACHE_TTL_SHORT;
  if (days <= 30) return CACHE_TTL_MEDIUM;
  return CACHE_TTL_LONG;
}

/**
 * Parse unix-ms timestamp from query string, returning undefined if absent or invalid.
 */
export function parseTimestamp(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Default period: last 30 days. Returns [start, end].
 */
export function defaultPeriod(): AnalyticsPeriod {
  const end = Date.now();
  const start = end - 30 * 86_400_000;
  return { start, end };
}

/**
 * Build cache key for analytics queries.
 */
export function buildCacheKey(
  type: "summary" | "timeseries" | "tags",
  projectId: string,
  components: Record<string, string | number>,
): string {
  const parts = Object.entries(components)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(":");
  return `analytics:${type}:${projectId}:${parts}`;
}

/**
 * Build conditions array for filtering conversations by project, optional date
 * range, and optional tag(s).
 */
export async function buildFilters(
  db: DrizzleD1Database,
  projectId: string,
  startParam: string | undefined,
  endParam: string | undefined,
  tags: string[] | undefined,
): Promise<AnalyticsFilters> {
  const defaultPeriod_ = defaultPeriod();
  const start = parseTimestamp(startParam) ?? defaultPeriod_.start;
  const end = parseTimestamp(endParam) ?? defaultPeriod_.end;

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
      return {
        conditions: baseConditions,
        period: { start, end },
        emptyResult: true,
      };
    }

    return {
      conditions: [
        ...baseConditions,
        inArray(
          conversations.id,
          rows.map((r) => r.conversationId),
        ),
      ],
      period: { start, end },
      emptyResult: false,
    };
  }

  return {
    conditions: baseConditions,
    period: { start, end },
    emptyResult: false,
  };
}

/**
 * Build cache key components for tag-based queries.
 */
export function buildTagCacheKey(tags: string[] | undefined): string {
  return tags && tags.length > 0 ? hashString(tags.sort().join(",")) : "none";
}

/**
 * Get SQL bucket expression for timeseries granularity.
 */
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

/**
 * Get SQL value expression for metric type.
 */
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

// ---------------------------------------------------------------------------
// Query Functions
// ---------------------------------------------------------------------------

/**
 * Generate summary analytics for a project.
 */
export async function getSummary(
  db: DrizzleD1Database,
  projectId: string,
  filters: AnalyticsFilters,
): Promise<SummaryResult> {
  const { conditions, period, emptyResult } = filters;

  if (emptyResult) {
    return {
      project_id: projectId,
      total_conversations: 0,
      total_messages: 0,
      total_tokens: 0,
      avg_messages_per_conversation: 0,
      avg_tokens_per_conversation: 0,
      period,
    };
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

  return {
    project_id: projectId,
    total_conversations: totalConvs,
    total_messages: totalMsgs,
    total_tokens: totalTokens,
    avg_messages_per_conversation:
      totalConvs > 0 ? Math.round((totalMsgs / totalConvs) * 10) / 10 : 0,
    avg_tokens_per_conversation:
      totalConvs > 0 ? Math.round((totalTokens / totalConvs) * 10) / 10 : 0,
    period,
  };
}

/**
 * Generate timeseries data for a specific metric.
 */
export async function getTimeseries(
  db: DrizzleD1Database,
  projectId: string,
  metric: Metric,
  granularity: Granularity,
  filters: AnalyticsFilters,
): Promise<TimeseriesResult> {
  const { conditions, period, emptyResult } = filters;

  if (emptyResult) {
    return {
      project_id: projectId,
      metric,
      granularity,
      period,
      data: [],
    };
  }

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

  return {
    project_id: projectId,
    metric,
    granularity,
    period,
    data: rows,
  };
}

/**
 * Generate tag usage analytics for a project.
 */
export async function getTagAnalytics(
  db: DrizzleD1Database,
  projectId: string,
  period: AnalyticsPeriod,
  limit: number,
): Promise<TagAnalyticsResult> {
  const { start, end } = period;

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

  return {
    project_id: projectId,
    period,
    data: rows,
  };
}
