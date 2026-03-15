import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import type { Bindings, Variables } from "../types";

export const dbMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    c.set("db", drizzle(c.env.DB));
    await next();
  },
);
