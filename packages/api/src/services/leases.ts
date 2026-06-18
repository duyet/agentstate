import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { stateLeases } from "../db/schema";
import { LEASE_DEFAULT_TTL_MS } from "../lib/config";
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
  const [active] = await db
    .select()
    .from(stateLeases)
    .where(
      and(
        eq(stateLeases.projectId, projectId),
        eq(stateLeases.stateKey, stateKey),
        isNull(stateLeases.releasedAt),
        gt(stateLeases.expiresAt, now),
      ),
    )
    .orderBy(desc(stateLeases.fencingToken))
    .limit(1);

  if (active) {
    return {
      error: {
        code: "LEASE_CONFLICT",
        message: "State already has an active lease",
        status: 409,
      },
    };
  }

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

  await db.insert(stateLeases).values(row);
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
