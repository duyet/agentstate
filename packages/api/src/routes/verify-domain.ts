import { Hono } from "hono";
import { isValidVerificationToken } from "../lib/domain-verification";
import type { Bindings, Variables } from "../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /verify-domain/:token
 *
 * Domain verification endpoint. Returns the token as plain text.
 * Used by domain providers (Cloudflare, Vercel, etc.) to verify
 * domain ownership via:
 *
 * - TXT record: _agentstate.example.com TXT {token}
 * - HTTP file: http://example.com/.well-known/agentstate-{token}
 * - Meta tag: <meta name="agentstate-verification" content="{token}">
 *
 * This endpoint responds to the HTTP verification method. The domain
 * provider will make a request to this endpoint with the token and
 * expect it to be echoed back as plain text.
 *
 * @param c - Hono context
 * @returns Plain text response with the token
 */
router.get("/verify-domain/:token", (c) => {
  const token = c.req.param("token");

  // Validate token format to prevent abuse
  if (!isValidVerificationToken(token)) {
    return c.text("Invalid token format", 400);
  }

  // Set content-type to plain text for domain provider verification
  c.header("Content-Type", "text/plain");

  // Return token as plain text for domain provider verification
  return c.text(token);
});

export default router;
