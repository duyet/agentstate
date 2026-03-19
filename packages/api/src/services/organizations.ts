// ---------------------------------------------------------------------------
// Organizations service — Business logic for Clerk organization sync
// ---------------------------------------------------------------------------

import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { organizations } from "../db/schema";
import { generateId } from "../lib/id";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  clerk_org_id: string;
  name: string;
  created_at: number;
  updated_at: number | null;
}

export interface SyncOrganizationInput {
  clerk_org_id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Organization Sync
// ---------------------------------------------------------------------------

/**
 * Sync a Clerk organization to the local database.
 * If the organization exists, updates the name if changed.
 * If not, creates a new organization record.
 *
 * @param db - Database instance
 * @param input - Clerk organization data
 * @returns Organization record with timestamps
 */
export async function syncOrganization(
  db: DrizzleD1Database,
  input: SyncOrganizationInput,
): Promise<Organization> {
  const { clerk_org_id, name } = input;
  const now = Date.now();

  // Check if org already exists
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerk_org_id))
    .get();

  if (existing) {
    // Update name if it has changed
    if (existing.name !== name) {
      await db.update(organizations).set({ name }).where(eq(organizations.id, existing.id));
    }

    return {
      id: existing.id,
      clerk_org_id: existing.clerkOrgId,
      name: existing.name,
      created_at: existing.createdAt,
      updated_at: now,
    };
  }

  // Create new org
  const orgId = generateId();
  await db.insert(organizations).values({
    id: orgId,
    clerkOrgId: clerk_org_id,
    name,
    createdAt: now,
  });

  return {
    id: orgId,
    clerk_org_id,
    name,
    created_at: now,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Organization Lookup
// ---------------------------------------------------------------------------

/**
 * Get an organization by Clerk org ID.
 *
 * @param db - Database instance
 * @param clerkOrgId - Clerk organization ID
 * @returns Organization record or null if not found
 */
export async function getOrganizationByClerkId(
  db: DrizzleD1Database,
  clerkOrgId: string,
): Promise<Organization | null> {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .get();

  if (!org) {
    return null;
  }

  return {
    id: org.id,
    clerk_org_id: org.clerkOrgId,
    name: org.name,
    created_at: org.createdAt,
    updated_at: null,
  };
}
