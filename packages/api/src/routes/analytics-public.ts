import { Hono } from "hono";
import { deprecationMiddleware } from "../lib/deprecation";
import { parseLimitParam } from "../lib/helpers";
import { apiKeyAuth } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { handleSummary, handleTags, handleTimeseries } from "../services/public-analytics";
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

  const result = await handleSummary(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    c.req.queries("tag"),
    c.env.AUTH_CACHE,
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

  const result = await handleTimeseries(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    c.req.queries("tag"),
    c.req.query("metric"),
    c.req.query("granularity"),
    c.env.AUTH_CACHE,
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

  const limit = parseLimitParam(c.req.query("limit"), 50, 200);

  const result = await handleTags(
    db,
    projectId,
    c.req.query("start"),
    c.req.query("end"),
    limit,
    c.env.AUTH_CACHE,
    c.executionCtx,
  );

  return c.json(result);
});

export default app;
