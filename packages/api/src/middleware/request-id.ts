import { createMiddleware } from "hono/factory";
import { nanoid } from "nanoid";
import type { Bindings, Variables } from "../types";

export const requestIdMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const requestId = c.req.header("X-Request-Id") || nanoid(16);
    c.header("X-Request-Id", requestId);
    await next();
  },
);
