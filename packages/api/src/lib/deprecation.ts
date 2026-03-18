import type { Context, Next } from "hono";
import type { Bindings, Variables } from "../types";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Add deprecation headers to API responses.
 *
 * Usage:
 * ```ts
 * import { setDeprecationHeaders } from "./lib/deprecation";
 *
 * app.get("/api/v1/old-endpoint", (c) => {
 *   setDeprecationHeaders(c, {
 *     message: "This endpoint is deprecated. Use /api/v2/new-endpoint instead.",
 *     sunsetDate: "2026-06-01",
 *     link: "https://docs.agentstate.app/api/v2/migration"
 *   });
 *   return c.json({ data: "..." });
 * });
 * ```
 */

interface DeprecationOptions {
  /** Human-readable deprecation message */
  message: string;
  /** ISO date string when the endpoint will be removed (optional) */
  sunsetDate?: string;
  /** URL to documentation about the deprecation (optional) */
  link?: string;
}

/**
 * Set deprecation headers on a Hono response context.
 */
export function setDeprecationHeaders(
  c: AppContext,
  { message, sunsetDate, link }: DeprecationOptions,
): void {
  c.header("X-API-Deprecation", message);

  if (sunsetDate) {
    c.header("Sunset", sunsetDate);
  }

  if (link) {
    c.header("Link", `<${link}>; rel="deprecation"`);
  }
}

/**
 * Create a middleware that adds deprecation headers to all responses.
 *
 * Usage:
 * ```ts
 * import { deprecationMiddleware } from "./lib/deprecation";
 *
 * const deprecatedRouter = new Hono();
 * deprecatedRouter.use("*", deprecationMiddleware({
 *   message: "This API version is deprecated. Use /api/v2 instead.",
 *   sunsetDate: "2026-12-31",
 *   link: "https://docs.agentstate.app/api/v2/overview"
 * }));
 * ```
 */
export function deprecationMiddleware(options: DeprecationOptions) {
  return async (c: AppContext, next: Next) => {
    await next();
    setDeprecationHeaders(c, options);
  };
}
