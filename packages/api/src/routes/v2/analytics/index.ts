import { Hono } from "hono";
import { parseLimitParam } from "../../../lib/helpers";
import { apiKeyAuth } from "../../../middleware/auth";
import { rateLimitMiddleware } from "../../../middleware/rate-limit";
import {
  buildCacheKey,
  buildFilters,
  buildTagCacheKey,
  defaultPeriod,
  getSummary,
  getTagAnalytics,
  getTimeseries,
  getTtlForPeriod,
  type Metric,
  parseTimestamp,
  VALID_GRANULARITIES,
  VALID_METRICS,
} from "../../../services/analytics";
import type { Bindings, Variables } from "../../../types";

type Granularity = (typeof VALID_GRANULARITIES)[number];

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth and rate-limit middleware
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get cached value or return null */
async function getCached<T>(cache: KVNamespace, key: string): Promise<T | null> {
  return (await cache.get(key, "json")) as T | null;
}

/** Set value in cache with TTL */
function setCached(
  cache: KVNamespace,
  key: string,
  value: unknown,
  ttl: number,
  ctx: ExecutionContext,
): void {
  ctx.waitUntil(cache.put(key, JSON.stringify(value), { expirationTtl: ttl }));
}

/** Parse metric param with fallback to default */
function parseMetric(raw: string | undefined): Metric {
  const metric = raw ?? "conversations";
  return VALID_METRICS.includes(metric as Metric) ? (metric as Metric) : "conversations";
}

/** Parse granularity param with fallback to default */
function parseGranularity(raw: string | undefined): Granularity {
  const granularity = raw ?? "day";
  return VALID_GRANULARITIES.includes(granularity as Granularity)
    ? (granularity as Granularity)
    : "day";
}

// ---------------------------------------------------------------------------
// GET /summary - Usage summary for a project
// ---------------------------------------------------------------------------

router.get("/summary", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const tags = c.req.queries("tag");

  const filters = await buildFilters(db, projectId, c.req.query("start"), c.req.query("end"), tags);

  const cacheKey = buildCacheKey("summary", projectId, {
    start: filters.period.start,
    end: filters.period.end,
    tags: buildTagCacheKey(tags),
  });
  const ttl = getTtlForPeriod(filters.period.start, filters.period.end);

  if (c.env.AUTH_CACHE) {
    const cached = await getCached(c.env.AUTH_CACHE, cacheKey);
    if (cached) return c.json(cached);
  }

  const result = await getSummary(db, projectId, filters);

  if (c.env.AUTH_CACHE) {
    setCached(c.env.AUTH_CACHE, cacheKey, result, ttl, c.executionCtx);
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /timeseries - Time-series data for a metric
// ---------------------------------------------------------------------------

router.get("/timeseries", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const metric = parseMetric(c.req.query("metric"));
  const granularity = parseGranularity(c.req.query("granularity"));
  const tags = c.req.queries("tag");

  const filters = await buildFilters(db, projectId, c.req.query("start"), c.req.query("end"), tags);

  const cacheKey = buildCacheKey("timeseries", projectId, {
    metric,
    granularity,
    start: filters.period.start,
    end: filters.period.end,
    tags: buildTagCacheKey(tags),
  });
  const ttl = getTtlForPeriod(filters.period.start, filters.period.end);

  if (c.env.AUTH_CACHE) {
    const cached = await getCached(c.env.AUTH_CACHE, cacheKey);
    if (cached) return c.json(cached);
  }

  const result = await getTimeseries(db, projectId, metric, granularity, filters);

  if (c.env.AUTH_CACHE) {
    setCached(c.env.AUTH_CACHE, cacheKey, result, ttl, c.executionCtx);
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /tags - Tag usage analytics
// ---------------------------------------------------------------------------

router.get("/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const { start, end } = defaultPeriod();
  const period = {
    start: parseTimestamp(c.req.query("start")) ?? start,
    end: parseTimestamp(c.req.query("end")) ?? end,
  };
  const limit = parseLimitParam(c.req.query("limit"), 50, 200);

  const cacheKey = buildCacheKey("tags", projectId, {
    start: period.start,
    end: period.end,
    limit,
  });
  const ttl = getTtlForPeriod(period.start, period.end);

  if (c.env.AUTH_CACHE) {
    const cached = await getCached(c.env.AUTH_CACHE, cacheKey);
    if (cached) return c.json(cached);
  }

  const result = await getTagAnalytics(db, projectId, period, limit);

  if (c.env.AUTH_CACHE) {
    setCached(c.env.AUTH_CACHE, cacheKey, result, ttl, c.executionCtx);
  }

  return c.json(result);
});

export default router;
