import type { DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
};

export type Variables = {
  db: DrizzleD1Database;
  projectId: string;
  /** SHA-256 hex hash of the authenticated API key — set by apiKeyAuth, used by rateLimitMiddleware */
  apiKeyHash: string;
};
