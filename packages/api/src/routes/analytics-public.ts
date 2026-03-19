import { Hono } from "hono";
import { deprecationMiddleware } from "../lib/deprecation";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import {
  buildCacheConfig,
  buildEmptySummaryResult,
  buildEmptyTimeseriesResult,
  buildFilters,
  buildSummaryResult,
  buildTagsResult,
  buildTimeseriesResult,
  defaultPeriod,
  type Granularity,
  type Metric,
  parseGranularity,
  parseMetric,
  parseTimestamp,
  querySummary,
  queryTags,
  queryTimeseries,
} from "../services/public-analytics";
import type { Bindings, Variables } from "../types";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use("*", apiKeyAuth);
app.use("*", rateLimitMiddleware);

// V1 deprecation notice
app.use(
  "*",
  deprecationMiddleware({
    message: "API v1 is deprecated. Use /api/v2/ instead.",
    sunsetDate: "2026-12-31",
    link: "https://docs.agentstate.app/api/v2/migration",
  }),
);

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

  const { key: cacheKey, ttl } = buildCacheConfig("summary", projectId, start, end, tags);

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  // When tag filter is active and no conversations matched, short-circuit with zeros
  if (emptyResult) {
    const result = buildEmptySummaryResult(start, end);
    // Cache the empty result
    if (c.env.AUTH_CACHE) {
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
      );
    }
    return c.json(result);
  }

  const totals = await querySummary(db, conditions);
  const result = buildSummaryResult(totals, start, end);

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

app.get("/timeseries", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const metricParam = c.req.query("metric") ?? "conversations";
  const granularityParam = c.req.query("granularity") ?? "day";

  const metric: Metric = parseMetric(metricParam);
  const granularity: Granularity = parseGranularity(granularityParam);

  const tags = c.req.queries("tag");
  const { conditions, start, end, emptyResult } = await buildFilters(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    tags,
  );

  const { key: cacheKey, ttl } = buildCacheConfig("timeseries", projectId, start, end, tags, {
    metric,
    granularity,
  });

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  if (emptyResult) {
    const result = buildEmptyTimeseriesResult(metric, granularity, start, end);
    // Cache the empty result
    if (c.env.AUTH_CACHE) {
      c.executionCtx.waitUntil(
        c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
      );
    }
    return c.json(result);
  }

  const data = await queryTimeseries(db, conditions, metric, granularity);
  const result = buildTimeseriesResult(metric, granularity, start, end, data);

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

  const { key: cacheKey, ttl } = buildCacheConfig("tags", projectId, start, end, undefined, {
    limit,
  });

  // Try cache first
  if (c.env.AUTH_CACHE) {
    const cached = await c.env.AUTH_CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached);
    }
  }

  const data = await queryTags(db, projectId, start, end, limit);
  const result = buildTagsResult(start, end, data);

  // Cache the result
  if (c.env.AUTH_CACHE) {
    c.executionCtx.waitUntil(
      c.env.AUTH_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl }),
    );
  }

  return c.json(result);
});

export default app;
