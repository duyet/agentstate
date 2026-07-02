import { verifyToken } from "@clerk/backend";
import type { Bindings } from "../types";

/**
 * Clerk session JWT claim shape (subset used by the dashboard).
 * See {@link https://clerk.com/docs/backend-requests/handling-manual-jwt}.
 */
export interface ClerkSessionClaims {
  /** User id (Clerk `sub` claim). */
  sub?: string;
  /** Active organization id (Clerk `o_id` claim) — present when an org is active. */
  o_id?: string;
  /** Legacy/fallback claim name for the active org id. */
  org_id?: string;
}

/**
 * Origins permitted as JWT `azp` (authorized party). Clerk recommends passing
 * `authorizedParties` to defend against the subdomain-cookie-leaking attack.
 */
export const AUTHORIZED_PARTIES = [
  "https://agentstate.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export interface VerifiedSession {
  clerkUserId: string;
  orgId: string;
}

/**
 * Verify a Clerk session token and return the verified claims.
 *
 * Returns the user id (`sub`) and active org id (`o_id`, falling back to
 * `org_id`). When the session has NO active Clerk organization, the org id is
 * derived per-user as `personal:${clerkUserId}` so that each personal account
 * maps to its OWN internal organization. This avoids collapsing every org-less
 * user into a single shared sentinel org (which would allow cross-tenant reads
 * between unrelated personal accounts). Throws on any verification failure so
 * callers can translate to a single 401.
 *
 * This is a thin seam over `@clerk/backend`'s `verifyToken`, extracted so it
 * can be replaced wholesale in tests (see `lib/clerk-session.ts` mock).
 */
export async function verifyDashboardSession(
  token: string,
  env: Pick<Bindings, "CLERK_SECRET_KEY" | "CLERK_JWT_KEY">,
): Promise<VerifiedSession> {
  const result = await verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY,
    authorizedParties: AUTHORIZED_PARTIES,
    ...(env.CLERK_JWT_KEY ? { jwtKey: env.CLERK_JWT_KEY } : {}),
  });

  // Public export resolves to the payload directly; the internal
  // {data, errors} shape is handled defensively in case of version drift.
  if (
    result &&
    typeof result === "object" &&
    "errors" in result &&
    (result as { errors?: unknown }).errors
  ) {
    throw new Error("token verification failed");
  }

  const claims = result as unknown as ClerkSessionClaims;
  const clerkUserId = claims.sub;
  if (!clerkUserId) {
    throw new Error("token missing sub claim");
  }

  return {
    clerkUserId,
    // Per-user discriminator when no active Clerk org — never a shared default.
    orgId: claims.o_id ?? claims.org_id ?? `personal:${clerkUserId}`,
  };
}
