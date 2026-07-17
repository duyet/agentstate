import { and, desc, eq, isNull, lte } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { stateLeases } from "../db/schema";
import { LEASE_DEFAULT_TTL_MS } from "../lib/config";
// isUniqueViolation turns the atomic active-lease uniqueness collision into a
// clean LEASE_CONFLICT.
import { isUniqueViolation } from "../lib/db-errors";
import { generateId } from "../lib/id";

export interface LeaseResponse {
  id: string;
  state_key: string;
  holder: string;
  fencing_token: number;
  expires_at: number;
  created_at: number;
  renewed_at: number;
}

export interface LeaseError {
  code: string;
  message: string;
  status: 404 | 409;
}

function toResponse(row: typeof stateLeases.$inferSelect): LeaseResponse {
  return {
    id: row.id,
    state_key: row.stateKey,
    holder: row.holder,
    fencing_token: row.fencingToken,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    renewed_at: row.renewedAt,
  };
}

export async function createLease(
  db: DrizzleD1Database,
  projectId: string,
  stateKey: string,
  holder: string,
  ttlMs = LEASE_DEFAULT_TTL_MS,
): Promise<{ lease?: LeaseResponse; error?: LeaseError }> {
  const now = Date.now();

  // Release any expired-but-not-released lease so a fresh lease can be acquired.
  // Live (unexpired) leases keep their `released_at IS NULL` row, which the
  // partial unique index below uses to reject a concurrent acquire.
  await db
    .update(stateLeases)
    .set({ releasedAt: now })
    .where(
      and(
        eq(stateLeases.projectId, projectId),
        eq(stateLeases.stateKey, stateKey),
        isNull(stateLeases.releasedAt),
        lte(stateLeases.expiresAt, now),
      ),
    );

  // Next fencing token is monotonic across ALL leases for this key (released or
  // not). The read is safe under contention because the INSERT below is the
  // real arbiter: two racers compute the same token, but the partial unique
  // index (project_id, state_key) WHERE released_at IS NULL lets only one win.
  const [lastLease] = await db
    .select({ fencingToken: stateLeases.fencingToken })
    .from(stateLeases)
    .where(and(eq(stateLeases.projectId, projectId), eq(stateLeases.stateKey, stateKey)))
    .orderBy(desc(stateLeases.fencingToken))
    .limit(1);

  const row = {
    id: generateId(),
    projectId,
    stateKey,
    holder,
    fencingToken: (lastLease?.fencingToken ?? 0) + 1,
    expiresAt: now + ttlMs,
    createdAt: now,
    renewedAt: now,
    releasedAt: null,
  };

  try {
    await db.insert(stateLeases).values(row);
  } catch (err) {
    // A live active lease already exists for this (project, state_key) — the
    // partial unique index rejected the insert. Report the contention.
    if (isUniqueViolation(err)) {
      return {
        error: {
          code: "LEASE_CONFLICT",
          message: "State already has an active lease",
          status: 409,
        },
      };
    }
    throw err;
  }

  return { lease: toResponse(row) };
}

export async function renewLease(
  db: DrizzleD1Database,
  projectId: string,
  leaseId: string,
  ttlMs = LEASE_DEFAULT_TTL_MS,
): Promise<{ lease?: LeaseResponse; error?: LeaseError }> {
  const now = Date.now();
  const [lease] = await db
    .select()
    .from(stateLeases)
    .where(and(eq(stateLeases.id, leaseId), eq(stateLeases.projectId, projectId)))
    .limit(1);

  if (!lease || lease.releasedAt !== null) {
    return { error: { code: "NOT_FOUND", message: "Lease not found", status: 404 } };
  }

  if (lease.expiresAt <= now) {
    return { error: { code: "LEASE_EXPIRED", message: "Lease has expired", status: 409 } };
  }

  const updates = { expiresAt: now + ttlMs, renewedAt: now };
  await db.update(stateLeases).set(updates).where(eq(stateLeases.id, leaseId));
  return { lease: toResponse({ ...lease, ...updates }) };
}

export async function releaseLease(
  db: DrizzleD1Database,
  projectId: string,
  leaseId: string,
): Promise<LeaseError | null> {
  const now = Date.now();
  const [lease] = await db
    .select()
    .from(stateLeases)
    .where(and(eq(stateLeases.id, leaseId), eq(stateLeases.projectId, projectId)))
    .limit(1);

  if (!lease || lease.releasedAt !== null) {
    return { code: "NOT_FOUND", message: "Lease not found", status: 404 };
  }

  await db.update(stateLeases).set({ releasedAt: now }).where(eq(stateLeases.id, leaseId));
  return null;
}
