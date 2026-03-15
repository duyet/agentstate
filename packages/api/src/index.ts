import { Hono } from "hono";
import { cors } from "hono/cors";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import aiRouter from "./routes/ai";
import conversationsRouter from "./routes/conversations";
import keysRouter from "./routes/keys";
import type { Bindings, Variables } from "./types";
import { LLMS_TXT, AGENTS_MD } from "./content/static";

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
// Health check (both / and /api for flexibility)
// ---------------------------------------------------------------------------

const health = (c: { json: Function }) =>
  c.json({ name: "agentstate", version: "0.1.0", status: "ok" });

app.get("/", health);
app.get("/api", health);

// ---------------------------------------------------------------------------
// Agent-readable endpoints — llms.txt and agents.md
// ---------------------------------------------------------------------------

app.get("/llms.txt", (c) => c.text(LLMS_TXT));
app.get("/agents.md", (c) => c.text(AGENTS_MD));
app.get("/api/llms.txt", (c) => c.text(LLMS_TXT));
app.get("/api/agents.md", (c) => c.text(AGENTS_MD));

// ---------------------------------------------------------------------------
// API routes — mounted at /api/v1/* for single-domain setup
// Also available at /v1/* for backward compatibility
// ---------------------------------------------------------------------------

// Primary: /api/v1/...
app.route("/api/v1/conversations", conversationsRouter);
app.route("/api/v1/conversations", aiRouter);
app.route("/api/projects", keysRouter);

// Backward compat: /v1/...
app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", aiRouter);

// ---------------------------------------------------------------------------
// Global error handler
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

app.notFound((c) => {
  return c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
});

export default app;
