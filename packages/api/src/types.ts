import type { DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  AUTH_CACHE?: KVNamespace; // Optional KV namespace for auth caching
  RATE_LIMITS?: KVNamespace; // Optional KV namespace for sliding window rate limiting
  VECTORIZE_INDEX?: VectorizeIndex; // Optional Vectorize index for semantic search
  STATE_STREAM_HUB?: DurableObjectNamespace; // Optional Durable Object namespace for state watch SSE
  /**
   * Clerk secret key used to verify dashboard session JWTs.
   * Required for dashboard-management routes — if unset, those routes fail-closed (401).
   */
  CLERK_SECRET_KEY?: string;
  /** Optional Clerk JWT public key (PEM) for networkless session verification. */
  CLERK_JWT_KEY?: string;
};

export type Variables = {
  db: DrizzleD1Database;
  d1Db: D1Database; // Raw D1 database for FTS5 and other custom queries
  projectId: string;
  /** SHA-256 hex hash of the authenticated API key — set by apiKeyAuth, used by rateLimitMiddleware */
  apiKeyHash: string;
  authType: "api_key" | "capability_token";
  capabilityScopes: string[];
  /** Clerk active organization id (o_id claim) — set by clerkDashboardAuth on dashboard-management routes. */
  orgId?: string;
  /** Clerk user id (sub claim) — set by clerkDashboardAuth on dashboard-management routes. */
  clerkUserId?: string;
};
