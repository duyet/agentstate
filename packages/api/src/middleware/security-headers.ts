import { createMiddleware } from "hono/factory";
import type { Bindings, Variables } from "../types";

/**
 * Clerk frontend-API domain for the dashboard's live instance. Confirmed via
 * DNS: `clerk.agentstate.app` CNAMEs to `frontend-api.clerk.services`. Clerk
 * loads its script and makes session calls against this origin.
 */
const CLERK_FRONTEND_API = "https://clerk.agentstate.app";

/**
 * Content-Security-Policy for the dashboard (HTML responses). Shipped
 * Report-Only first — see the flip note below. `'unsafe-inline'` on
 * script-src is a pragmatic starting point for Astro's inlined bootstrap
 * scripts and Clerk; dropping it in favor of nonces is the documented
 * follow-up (see plans/010-dashboard-csp.md).
 */
const DASHBOARD_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CLERK_FRONTEND_API}`,
  `connect-src 'self' ${CLERK_FRONTEND_API}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `frame-src ${CLERK_FRONTEND_API}`,
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
].join("; ");

/**
 * Trivial enforcing policy for API (JSON) responses. Safe to enforce
 * immediately — JSON responses never execute scripts or render as documents.
 */
const API_CSP = "default-src 'none'";

/**
 * Sets standard security response headers on every response.
 *
 * Headers applied:
 * - X-Content-Type-Options: nosniff         — prevents MIME-type sniffing
 * - X-Frame-Options: DENY                   — disallows framing (clickjacking protection)
 * - Referrer-Policy: strict-origin-when-cross-origin — limits referrer leakage
 * - Strict-Transport-Security: max-age=31536000; includeSubDomains
 *                                           — enforces HTTPS (safe; no preload)
 * - Content-Security-Policy-Report-Only (HTML responses) / Content-Security-Policy
 *   (everything else) — see DASHBOARD_CSP / API_CSP above.
 *
 * FLIP TO ENFORCING: once production Report-Only violation reports are clean
 * for a few days, rename `Content-Security-Policy-Report-Only` below to
 * `Content-Security-Policy` for the HTML branch.
 *
 * Intentionally excluded (deferred for human review):
 * - Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy / Cross-Origin-Resource-Policy
 *   — can break legitimate cross-origin API fetches
 */
export const securityHeaders = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    const contentType = c.res.headers.get("Content-Type") ?? "";
    if (contentType.includes("text/html")) {
      c.header("Content-Security-Policy-Report-Only", DASHBOARD_CSP);
    } else {
      c.header("Content-Security-Policy", API_CSP);
    }
  },
);
