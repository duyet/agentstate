import { Hono } from "hono";
import { cors } from "hono/cors";
import { OPENAPI_SPEC } from "./content/openapi";
import { AGENTS_MD, LLMS_TXT } from "./content/static";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";
import conversationsRouter from "./routes/conversations";
import keysRouter from "./routes/keys";
import projectsRouter from "./routes/projects";
import tagsRouter from "./routes/tags";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use("*", requestIdMiddleware);
app.use(
  "*",
  cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"] }),
);
app.use("*", dbMiddleware);

// ---------------------------------------------------------------------------
// API health check
// ---------------------------------------------------------------------------

app.get("/api", (c) => {
  return c.json({ name: "agentstate", version: "0.1.0", status: "ok" });
});

// ---------------------------------------------------------------------------
// Agent-readable endpoints
// ---------------------------------------------------------------------------

app.get("/llms.txt", (c) => c.text(LLMS_TXT));
app.get("/agents.md", (c) => c.text(AGENTS_MD));
app.get("/openapi.json", (c) => c.json(JSON.parse(OPENAPI_SPEC)));

// ---------------------------------------------------------------------------
// API routes at /api/v1/*
// ---------------------------------------------------------------------------

app.route("/api/v1/conversations", conversationsRouter);
app.route("/api/v1/conversations", aiRouter);
app.route("/api/projects", keysRouter);
// Dashboard-internal project management routes (no API key auth required)
app.route("/api/v1/projects", projectsRouter);
// Analytics routes: /api/v1/projects/:id/analytics
app.route("/api/v1/projects", analyticsRouter);
// Tags routes: handles /api/v1/conversations/:id/tags and /api/v1/tags
app.route("/api/v1", tagsRouter);

// Backward compat at /v1/*
app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", aiRouter);
// Backward compat tags at /v1/*
app.route("/v1", tagsRouter);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

app.onError((err, c) => {
  const requestId = c.res.headers.get("X-Request-Id");
  console.error(
    JSON.stringify({
      level: "error",
      request_id: requestId,
      method: c.req.method,
      path: c.req.path,
      error: err.message,
      stack: err.stack,
    }),
  );
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
});

// Non-API routes → static assets (dashboard)
export default app;
