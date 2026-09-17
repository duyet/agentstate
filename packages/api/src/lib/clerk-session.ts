import { verifyToken } from "@clerk/backend";
import type { Bindings } from "../types";

/**
 * Origins permitted as JWT `azp` (authorized party). Clerk recommends passing
 * `authorizedParties` to defend against the subdomain-cookie-leaking attack.
 */
export const AUTHORIZED_PARTIES = [
  "https://agentstate.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export type DashboardPrincipal = { kind: "user" | "organization"; subject: string };

export interface VerifiedSession {
  clerkUserId: string;
  orgId: string;
  principal: DashboardPrincipal;
}

/** Normalize verified claims. Malformed active organizations must never become personal. */
export function normalizeSessionClaims(claims: Record<string, unknown>): VerifiedSession {
  if (typeof claims.sub !== "string" || !claims.sub.trim() || claims.sub !== claims.sub.trim()) {
    throw new Error("token missing valid sub claim");
  }
  const values: unknown[] = [];
  for (const key of ["o_id", "org_id"]) {
    if (Object.hasOwn(claims, key)) values.push(claims[key]);
  }
  if (Object.hasOwn(claims, "o")) {
    if (!claims.o || typeof claims.o !== "object" || Array.isArray(claims.o)) {
      throw new Error("malformed active organization");
    }
    values.push((claims.o as Record<string, unknown>).id);
  }
  if (
    values.some((v) => typeof v !== "string" || !v.trim() || v !== v.trim()) ||
    new Set(values).size > 1
  )
    throw new Error("invalid active organization");
  const activeOrg = values[0] as string | undefined;
  // Reserved legacy/personal namespaces cannot be used as organization subjects.
  if (activeOrg === "default" || activeOrg?.startsWith("personal:")) {
    throw new Error("invalid active organization");
  }
  return {
    clerkUserId: claims.sub,
    orgId: activeOrg ?? `personal:${claims.sub}`,
    principal: activeOrg
      ? { kind: "organization", subject: activeOrg }
      : { kind: "user", subject: claims.sub },
  };
}

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

  return normalizeSessionClaims(result as unknown as Record<string, unknown>);
}
