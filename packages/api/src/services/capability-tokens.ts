import { and, eq, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { capabilityTokens } from "../db/schema";
import { hashApiKey } from "../lib/crypto";
import { generateCapabilityToken, generateId } from "../lib/id";
import { encodeJson } from "../lib/state-json";
import type { CapabilityScope } from "../lib/validation";

export interface CapabilityTokenResponse {
  id: string;
  name: string;
  key_prefix: string;
  scopes: CapabilityScope[];
  expires_at: number | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface CreatedCapabilityTokenResponse extends CapabilityTokenResponse {
  token: string;
}

function parseScopes(value: string): CapabilityScope[] {
  try {
    const scopes = JSON.parse(value);
    return Array.isArray(scopes) ? scopes : [];
  } catch {
    return [];
  }
}

export function mapCapabilityToken(
  row: typeof capabilityTokens.$inferSelect,
): CapabilityTokenResponse {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.keyPrefix,
    scopes: parseScopes(row.scopes),
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    last_used_at: row.lastUsedAt,
    revoked_at: row.revokedAt,
  };
}

export async function createCapabilityToken(
  db: DrizzleD1Database,
  projectId: string,
  input: { name: string; scopes: CapabilityScope[]; expires_at?: number },
): Promise<CreatedCapabilityTokenResponse> {
  const token = generateCapabilityToken();
  const now = Date.now();
  const row = {
    id: generateId(),
    projectId,
    name: input.name,
    keyPrefix: token.substring(0, 12),
    keyHash: await hashApiKey(token),
    scopes: encodeJson([...new Set(input.scopes)].sort()),
    expiresAt: input.expires_at ?? null,
    createdAt: now,
  };

  await db.insert(capabilityTokens).values(row);
  return { ...mapCapabilityToken({ ...row, lastUsedAt: null, revokedAt: null }), token };
}

export async function listCapabilityTokens(
  db: DrizzleD1Database,
  projectId: string,
): Promise<CapabilityTokenResponse[]> {
  const rows = await db
    .select()
    .from(capabilityTokens)
    .where(and(eq(capabilityTokens.projectId, projectId), isNull(capabilityTokens.revokedAt)));
  return rows.map(mapCapabilityToken);
}

export async function revokeCapabilityToken(
  db: DrizzleD1Database,
  projectId: string,
  tokenId: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: capabilityTokens.id })
    .from(capabilityTokens)
    .where(and(eq(capabilityTokens.id, tokenId), eq(capabilityTokens.projectId, projectId)))
    .limit(1);

  if (!existing) return false;

  await db
    .update(capabilityTokens)
    .set({ revokedAt: Date.now() })
    .where(and(eq(capabilityTokens.id, tokenId), eq(capabilityTokens.projectId, projectId)));
  return true;
}
