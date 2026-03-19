import { Hono } from "hono";
import { deprecationMiddleware } from "../lib/deprecation";
import { parseLimitParam } from "../lib/helpers";
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
  parseGranularity,
  parseMetric,
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

  const result = await withCacheOrEmpty(
    c.env.AUTH_CACHE,
    buildCacheConfig("summary", projectId, start, end, tags),
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
  const tags = c.req.queries("tag");

  const metric = parseMetric(c.req.query("metric"));
  const granularity = parseGranularity(c.req.query("granularity"));

  const { conditions, start, end, emptyResult } = await buildFilters(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    tags,
  );

  const result = await withCacheOrEmpty(
    c.env.AUTH_CACHE,
    buildCacheConfig("timeseries", projectId, start, end, tags, { metric, granularity }),
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

  const { start, end } = await buildFilters(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    undefined,
  );
  const limit = parseLimitParam(c.req.query("limit"), 50, 200);

  const result = await withCache(
    c.env.AUTH_CACHE,
    buildCacheConfig("tags", projectId, start, end, undefined, { limit }),
    () =>
      queryTags(db, projectId, start, end, limit).then((data) => buildTagsResult(start, end, data)),
    c.executionCtx,
  );

  return c.json(result);
});

export default app;
