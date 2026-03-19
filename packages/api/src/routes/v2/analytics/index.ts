import { Hono } from "hono";
import { parseLimitParam } from "../../../lib/helpers";
import { apiKeyAuth } from "../../../middleware/auth";
import { rateLimitMiddleware } from "../../../middleware/rate-limit";
import {
  buildCacheKey,
  buildFilters,
  buildTagCacheKey,
  defaultPeriod,
  type Granularity,
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth and rate-limit middleware
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// ---------------------------------------------------------------------------
// GET /summary - Usage summary for a project
// ---------------------------------------------------------------------------

router.get("/summary", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const tags = c.req.queries("tag");

  const filters = await buildFilters(db, projectId, c.req.query("start"), c.req.query("end"), tags);

  // Build cache key
  const cacheKey = buildCacheKey("summary", projectId, {
    start: filters.period.start,
    end: filters.period.end,
    tags: buildTagCacheKey(tags),
  });
  const ttl = getTtlForPeriod(filters.period.start, filters.period.end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // Get summary from service
  const result = await getSummary(db, projectId, filters);

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /timeseries - Time-series data for a metric
// ---------------------------------------------------------------------------

router.get("/timeseries", async (c) => {
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
  const filters = await buildFilters(db, projectId, c.req.query("start"), c.req.query("end"), tags);

  // Build cache key
  const cacheKey = buildCacheKey("timeseries", projectId, {
    metric,
    granularity,
    start: filters.period.start,
    end: filters.period.end,
    tags: buildTagCacheKey(tags),
  });
  const ttl = getTtlForPeriod(filters.period.start, filters.period.end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // Get timeseries from service
  const result = await getTimeseries(db, projectId, metric, granularity, filters);

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /tags - Tag usage analytics
// ---------------------------------------------------------------------------

router.get("/tags", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const defaultPeriod_ = defaultPeriod();
  const start = parseTimestamp(c.req.query("start")) ?? defaultPeriod_.start;
  const end = parseTimestamp(c.req.query("end")) ?? defaultPeriod_.end;

  const limit = parseLimitParam(c.req.query("limit"), 50, 200);

  const period = { start, end };

  // Build cache key
  const cacheKey = buildCacheKey("tags", projectId, {
    start,
    end,
    limit,
  });
  const ttl = getTtlForPeriod(start, end);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // Get tag analytics from service
  const result = await getTagAnalytics(db, projectId, period, limit);

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

export default router;
