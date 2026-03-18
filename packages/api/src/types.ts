import type { DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  AUTH_CACHE?: KVNamespace; // Optional KV namespace for auth caching
  RATE_LIMITS?: KVNamespace; // Optional KV namespace for sliding window rate limiting
};

export type Variables = {
  db: DrizzleD1Database;
  d1Db: D1Database; // Raw D1 database for FTS5 and other custom queries
  projectId: string;
  /** SHA-256 hex hash of the authenticated API key — set by apiKeyAuth, used by rateLimitMiddleware */
  apiKeyHash: string;
};
