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
  withCache,
  withCacheOrEmpty,
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

  const result = await withCacheOrEmpty(
    c.env.AUTH_CACHE,
    cacheKey,
    ttl,
    emptyResult,
    () => buildEmptySummaryResult(start, end),
    () => querySummary(db, conditions).then((totals) => buildSummaryResult(totals, start, end)),
    c.executionCtx,
  );

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

  const result = await withCacheOrEmpty(
    c.env.AUTH_CACHE,
    cacheKey,
    ttl,
    emptyResult,
    () => buildEmptyTimeseriesResult(metric, granularity, start, end),
    () =>
      queryTimeseries(db, conditions, metric, granularity).then((data) =>
        buildTimeseriesResult(metric, granularity, start, end, data),
      ),
    c.executionCtx,
  );

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

  const result = await withCache(
    c.env.AUTH_CACHE,
    cacheKey,
    ttl,
    () =>
      queryTags(db, projectId, start, end, limit).then((data) => buildTagsResult(start, end, data)),
    c.executionCtx,
  );

  return c.json(result);
});

export default app;
