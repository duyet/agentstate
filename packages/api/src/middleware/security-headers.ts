import { createMiddleware } from "hono/factory";
import type { Bindings, Variables } from "../types";

/**
 * Sets standard security response headers on every response.
 *
 * Headers applied:
 * - X-Content-Type-Options: nosniff         — prevents MIME-type sniffing
 * - X-Frame-Options: DENY                   — disallows framing (clickjacking protection)
 * - Referrer-Policy: strict-origin-when-cross-origin — limits referrer leakage
 * - Strict-Transport-Security: max-age=31536000; includeSubDomains
 *                                           — enforces HTTPS (safe; no preload)
 *
 * Intentionally excluded (deferred for human review):
 * - Content-Security-Policy — needs careful tuning to avoid breaking the dashboard
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
  },
);
