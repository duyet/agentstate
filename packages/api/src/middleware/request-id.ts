import { createMiddleware } from "hono/factory";
import { nanoid } from "nanoid";
import type { Bindings, Variables } from "../types";

const SAFE_ID = /^[a-zA-Z0-9_\-]{1,64}$/;

export const requestIdMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const caller = c.req.header("X-Request-Id");
    const requestId = caller && SAFE_ID.test(caller) ? caller : nanoid(16);
    c.header("X-Request-Id", requestId);
    await next();
  },
);
