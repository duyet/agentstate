import { Hono } from "hono";
import { cors } from "hono/cors";
import { OPENAPI_SPEC } from "./content/openapi";
import { AGENTS_MD, LLMS_TXT } from "./content/static";
import { errorResponse } from "./lib/helpers";
import { clerkDashboardAuth } from "./middleware/clerk-dashboard-auth";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import aiRouter from "./routes/ai";
import analyticsRouter from "./routes/analytics";
import analyticsPublicRouter from "./routes/analytics-public";
import conversationsRouter from "./routes/conversations";
import domainsRouter from "./routes/domains";
import keysRouter from "./routes/keys";
import projectTracesRouter from "./routes/project-traces";
import projectsRouter from "./routes/projects";
import tagsRouter from "./routes/tags";
// V2-only features — new capabilities with no v1 equivalent
import capabilityTokensV2Router from "./routes/v2/capability-tokens";
import claimsV2Router from "./routes/v2/claims";
import leasesV2Router from "./routes/v2/leases";
import organizationsV2Router from "./routes/v2/organizations";
import statesV2Router from "./routes/v2/states";
import verifyDomainRouter from "./routes/verify-domain";
import webhooksRouter from "./routes/webhooks";
import { onScheduled } from "./scheduled";
import type { Bindings, Variables } from "./types";

export { StateStreamHub } from "./state-stream-hub";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use("*", requestIdMiddleware);
app.use("*", securityHeaders);

// CORS configuration with origin reflection for security
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
      if (!origin) return "*";
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      return ALLOWED_ORIGINS[0];
    },
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "X-Request-Id",
      "Idempotency-Key",
      "X-Lease-Id",
      "Last-Event-ID",
    ],
    credentials: true,
  }),
);
app.use("*", dbMiddleware);

// ---------------------------------------------------------------------------
// Dashboard-management auth (Clerk session)
// ---------------------------------------------------------------------------
// These routes are used by the dashboard (Clerk-authenticated, same-origin)
// to manage projects, analytics, domains, and organizations. They MUST NOT be
// reachable without a verified Clerk session — fail-closed via
// clerkDashboardAuth. Registered before the route mounts below so the guard
// runs on every matching request.
// See the route classification in docs/security for the full audit.
// ---------------------------------------------------------------------------

app.use("/api/v1/projects", clerkDashboardAuth);
app.use("/api/v1/projects/*", clerkDashboardAuth);
app.use("/api/v1/organizations", clerkDashboardAuth);
app.use("/api/v1/organizations/*", clerkDashboardAuth);

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
// Unified API at /api/v1/*
// One API version — v1 is the latest and only version.
//
// IMPORTANT: Routes with scoped auth (states, leases, tokens, claims) must be
// registered BEFORE the tags router, whose router.use("*", apiKeyAuth) would
// otherwise intercept all /api/v1/* requests and reject capability tokens.
// ---------------------------------------------------------------------------

// --- Scoped-auth routes (must come before apiKeyAuth routers) ---

// State management: /api/v1/states/*
app.route("/api/v1/states", statesV2Router);

// Distributed locking: /api/v1/leases/*
app.route("/api/v1/leases", leasesV2Router);

// Scoped auth tokens: /api/v1/capability-tokens/*
app.route("/api/v1/capability-tokens", capabilityTokensV2Router);

// Verifiable claims: /api/v1/claims/*
app.route("/api/v1/claims", claimsV2Router);

// Organizations: /api/v1/organizations/*
// Dashboard-management route — protected by Clerk session auth below.
app.route("/api/v1/organizations", organizationsV2Router);

// --- API-key-auth routes ---

// Conversations (CRUD, messages, search, bulk, analytics)
app.route("/api/v1/conversations", conversationsRouter);
app.route("/api/v1/conversations", aiRouter);

// Project management
app.route("/api/v1/projects", projectsRouter);

// API keys (at /api/projects for backward compat)
app.route("/api/projects", keysRouter);

// Analytics: /api/v1/projects/:id/analytics
app.route("/api/v1/projects", analyticsRouter);

// Traces (Clerk-authed dashboard view): /api/v1/projects/:id/traces
app.route("/api/v1/projects", projectTracesRouter);

// Tags: handles /api/v1/conversations/:id/tags and /api/v1/tags
// NOTE: router.use("*", apiKeyAuth) applies to /api/v1/* — keep after scoped routes
app.route("/api/v1", tagsRouter);

// Webhooks: /api/v1/webhooks
app.route("/api/v1/webhooks", webhooksRouter);

// Custom domains: /api/v1/projects/:id/domains
app.route("/api/v1/projects", domainsRouter);

// Public analytics at /api/v1/analytics
app.route("/api/v1/analytics", analyticsPublicRouter);

// Backward compat at /v1/*
app.route("/v1/conversations", conversationsRouter);
app.route("/v1/conversations", aiRouter);
app.route("/v1", tagsRouter);
app.route("/v1/analytics", analyticsPublicRouter);

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
export default {
  fetch: app.fetch,
  scheduled: onScheduled,
};
