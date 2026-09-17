import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { organizations } from "../db/schema";
import type { DashboardPrincipal } from "../lib/clerk-session";
import { generateId } from "../lib/id";

export interface Organization {
  id: string;
  clerk_org_id: string;
  name: string;
  created_at: number;
  updated_at: number | null;
}

export class IdentityConflictError extends Error {
  constructor() {
    super("Workspace identity requires verified recovery");
  }
}

/** Resolve only persisted bindings; compatibility fields never grant access. */
export async function resolveTenant(
  db: D1Database,
  principal: DashboardPrincipal,
): Promise<string> {
  const lookup = () =>
    db
      .prepare(`SELECT i.organization_id AS id FROM organization_identities i
    JOIN organizations o ON o.id = i.organization_id
    WHERE i.principal_kind = ? AND i.clerk_subject = ?`)
      .bind(principal.kind, principal.subject)
      .first<{ id: string }>();
  const existing = await lookup();
  if (existing) return existing.id;

  const id = generateId();
  const compatibilityId =
    principal.kind === "user" ? `personal:${principal.subject}` : principal.subject;
  // D1 batch is transactional. Only the request that inserts this candidate can
  // bind it. A concurrent winner is re-read below; an unbound legacy match is
  // quarantined, never adopted or replaced. No network calls or data transfers.
  await db.batch([
    db
      .prepare(`INSERT INTO organizations (id, clerk_org_id, name, created_at)
      SELECT ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM organizations WHERE clerk_org_id = ?
      ) AND NOT EXISTS (
        SELECT 1 FROM organization_identities WHERE principal_kind = ? AND clerk_subject = ?
      )`)
      .bind(
        id,
        compatibilityId,
        principal.kind === "user" ? "Personal" : compatibilityId,
        Date.now(),
        compatibilityId,
        principal.kind,
        principal.subject,
      ),
    db
      .prepare(`INSERT INTO organization_identities (principal_kind, clerk_subject, organization_id)
      SELECT ?, ?, id FROM organizations WHERE id = ?`)
      .bind(principal.kind, principal.subject, id),
  ]);
  const resolved = await lookup();
  if (!resolved) throw new IdentityConflictError();
  return resolved.id;
}

/** Sync display name only, on the tenant already resolved by authentication. */
export async function syncOrganization(
  db: DrizzleD1Database,
  tenantId: string,
  name: string,
): Promise<Organization> {
  const [org] = await db
    .update(organizations)
    .set({ name })
    .where(eq(organizations.id, tenantId))
    .returning();
  if (!org) throw new IdentityConflictError();
  return {
    id: org.id,
    clerk_org_id: org.clerkOrgId,
    name: org.name,
    created_at: org.createdAt,
    updated_at: Date.now(),
  };
}

export async function getOrganizationById(
  db: DrizzleD1Database,
  tenantId: string,
): Promise<Organization | null> {
  const org = await db.select().from(organizations).where(eq(organizations.id, tenantId)).get();
  return org
    ? {
        id: org.id,
        clerk_org_id: org.clerkOrgId,
        name: org.name,
        created_at: org.createdAt,
        updated_at: null,
      }
    : null;
}
