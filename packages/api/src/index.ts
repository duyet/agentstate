import { Hono } from "hono";
import { cors } from "hono/cors";
import { OPENAPI_SPEC } from "./content/openapi";
import { AGENTS_MD, LLMS_TXT } from "./content/static";
import { errorResponse } from "./lib/helpers";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";
import analyticsPublicRouter from "./routes/analytics-public";
import conversationsRouter from "./routes/conversations";
import keysRouter from "./routes/keys";
import projectsRouter from "./routes/projects";
import tagsRouter from "./routes/tags";
import conversationsV2Router from "./routes/v2/conversations";
import projectsV2Router from "./routes/v2/projects";
import verifyDomainRouter from "./routes/verify-domain";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use("*", requestIdMiddleware);

// CORS configuration with origin reflection for security
// - Same-origin requests work (dashboard static assets on same Worker)
// - Local development: localhost origins allowed
// - Production: only agentstate.app allowed
// - Any other origin: denied (returns first allowed origin, browser rejects mismatched response)
const ALLOWED_ORIGINS = [
  "https://agentstate.app",
  "http://localhost:3000",
  "http://localhost:8787",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8787",
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
      if (!origin) return "*";

      // Reflect allowed origins back to browser; deny unknown origins
      // Browser will reject response if origin doesn't match what was sent
      if (ALLOWED_ORIGINS.includes(origin)) return origin;

      // Origin not allowed: return a safe default, browser will reject
      return ALLOWED_ORIGINS[0];
    },
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    credentials: true, // Allow cookies/auth headers for same-origin requests
  }),
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
// Public analytics at /v1/analytics and /api/v1/analytics
app.route("/v1/analytics", analyticsPublicRouter);
app.route("/api/v1/analytics", analyticsPublicRouter);

// ---------------------------------------------------------------------------
// API routes at /api/v2/*
// ---------------------------------------------------------------------------

app.route("/api/v2/conversations", conversationsV2Router);
app.route("/api/v2/projects", projectsV2Router);

// Domain verification endpoint (no auth required, used by domain providers)
app.route("/", verifyDomainRouter);

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
  return errorResponse(c, "INTERNAL_ERROR", "Internal server error", 500);
});

// Non-API routes → static assets (dashboard)
export default app;
