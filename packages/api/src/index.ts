import { Hono } from "hono";
import { cors } from "hono/cors";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import conversationsRouter from "./routes/conversations";
import keysRouter from "./routes/keys";
import aiRouter from "./routes/ai";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use("*", requestIdMiddleware);
app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"] }));
app.use("*", dbMiddleware);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/", (c) => {
  return c.json({ name: "agentstate", version: "0.1.0", status: "ok" });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", aiRouter);
app.route("/api/projects", keysRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.onError((err, c) => {
  const requestId = c.res.headers.get("X-Request-Id");
  console.error(JSON.stringify({
    level: "error",
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: err.stack,
  }));
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500,
  );
});

app.notFound((c) => {
  return c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
});

export default app;
