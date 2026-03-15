import { Hono } from "hono";
import { cors } from "hono/cors";
import { AGENTS_MD, LLMS_TXT } from "./content/static";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import aiRouter from "./routes/ai";
import conversationsRouter from "./routes/conversations";
import keysRouter from "./routes/keys";
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

// ---------------------------------------------------------------------------
// API routes at /api/v1/*
// ---------------------------------------------------------------------------

app.route("/api/v1/conversations", conversationsRouter);
app.route("/api/v1/conversations", aiRouter);
app.route("/api/projects", keysRouter);

// Backward compat at /v1/*
app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", aiRouter);

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
