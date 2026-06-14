import { createMiddleware } from "hono/factory";
import { verifyDashboardSession } from "../lib/clerk-session";
import { errorResponse } from "../lib/helpers";
import type { Bindings, Variables } from "../types";

/**
 * Read the Clerk session token from (in priority order) the `__session` cookie,
 * the `__clerk_db_jwt` dev cookie, or an `Authorization: Bearer` header.
 */
function readSessionToken(req: { header: (name: string) => string | undefined }): string | null {
  // Explicit bearer token takes precedence (programmatic dashboard client).
  const authHeader = req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  // Parse the Cookie header directly (works across Hono versions).
  const cookieHeader = req.header("Cookie") ?? "";
  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    cookies.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }

  // Production: __session cookie (set by Clerk on the same origin).
  const sessionCookie = cookies.get("__session");
  if (sessionCookie) return sessionCookie;

  // Dev: __clerk_db_jwt cookie (Clerk dev-browser session).
  const devCookie = cookies.get("__clerk_db_jwt");
  if (devCookie) return devCookie;

  return null;
}

/**
 * Auth middleware for dashboard-management routes.
 *
 * Verifies a Clerk session JWT and, on success, exposes the verified Clerk
 * organization id (`orgId`) and user id (`clerkUserId`) on the Hono context.
 *
 * FAIL-CLOSED: if `CLERK_SECRET_KEY` is unset (config error) OR the token is
 * missing/invalid/expired, the request is rejected with 401. No request ever
 * reaches the dashboard-management handlers without a verified session.
 */
export const clerkDashboardAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const secretKey = c.env.CLERK_SECRET_KEY;

    // Config error — never let requests through without the ability to verify.
    if (!secretKey) {
      console.error(
        "[security] CLERK_SECRET_KEY is not set. Dashboard-management routes are refusing all requests (fail-closed).",
      );
      return errorResponse(c, "UNAUTHORIZED", "Authentication required", 401);
    }

    const token = readSessionToken(c.req);
    if (!token) {
      return errorResponse(c, "UNAUTHORIZED", "Authentication required", 401);
    }

    let session: { clerkUserId: string; orgId: string };
    try {
      session = await verifyDashboardSession(token, c.env);
    } catch {
      // verifyToken rejects on invalid/expired/tampered tokens — fail-closed.
      return errorResponse(c, "UNAUTHORIZED", "Authentication required", 401);
    }

    c.set("clerkUserId", session.clerkUserId);
    c.set("orgId", session.orgId);

    await next();
  },
);
