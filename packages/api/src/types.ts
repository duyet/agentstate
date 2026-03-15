import { DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = {
  DB: D1Database;
  AI: Ai;
};

export type Variables = {
  db: DrizzleD1Database;
  projectId: string;
};
