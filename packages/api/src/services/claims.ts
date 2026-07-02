import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { claimEvidence, claims, claimVerificationRuns, stateEvents } from "../db/schema";
import { generateId } from "../lib/id";
import { decodeJson, encodeJson, readJsonPath, sha256Hex } from "../lib/state-json";

export type ClaimStatus = "pending" | "verified" | "failed";
export type EvidenceKind = "state_event" | "text_hash" | "json_value";

export interface CreateEvidenceInput {
  kind: EvidenceKind;
  source: string;
  data?: unknown;
  hash?: string;
  jsonPath?: string;
  expectedValue?: unknown;
}

export interface CreateClaimInput {
  projectId: string;
  subjectType: string;
  subjectId: string;
  statement: string;
  evidence: CreateEvidenceInput[];
}

export interface ListClaimsOptions {
  limit: number;
  cursor?: string;
  order: "asc" | "desc";
  subjectType?: string;
  subjectId?: string;
}

export interface ClaimResponse {
  id: string;
  project_id: string;
  subject_type: string;
  subject_id: string;
  statement: string;
  status: ClaimStatus;
  created_at: number;
  updated_at: number;
  evidence?: EvidenceResponse[];
}

export interface EvidenceResponse {
  id: string;
  project_id: string;
  claim_id: string;
  kind: EvidenceKind;
  source: string;
  data: unknown;
  hash: string | null;
  json_path: string | null;
  expected_value: unknown;
  created_at: number;
}

export interface VerificationRunResponse {
  id: string;
  project_id: string;
  claim_id: string;
  status: Exclude<ClaimStatus, "pending">;
  details: VerificationDetails;
  created_at: number;
}

export interface VerificationDetails {
  results: VerificationEvidenceResult[];
}

export interface VerificationEvidenceResult {
  evidence_id: string;
  kind: EvidenceKind;
  source: string;
  passed: boolean;
  message: string;
}

export interface ListClaimsResult {
  rows: ClaimResponse[];
  nextCursor: string | null;
  error?: { code: string; message: string; status: 400 };
}

export function validateClaimCursor(
  cursorParam: string | undefined,
): { valid: true } | { valid: false; error: string } {
  if (cursorParam === undefined) {
    return { valid: true };
  }

  // Composite cursor "<createdAt>.<id>" (tie-break by id); a bare "<createdAt>"
  // timestamp is still accepted for backward compatibility.
  const dot = cursorParam.lastIndexOf(".");
  const tsStr = dot === -1 ? cursorParam : cursorParam.slice(0, dot);
  const cursorNum = Number(tsStr);
  if (
    Number.isNaN(cursorNum) ||
    !Number.isFinite(cursorNum) ||
    cursorNum < 0 ||
    cursorNum > Number.MAX_SAFE_INTEGER
  ) {
    return {
      valid: false,
      error: "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
    };
  }

  return { valid: true };
}

export async function createClaim(
  db: DrizzleD1Database,
  input: CreateClaimInput,
): Promise<ClaimResponse> {
  const now = Date.now();
  const claimId = generateId();
  const evidenceRows = input.evidence.map((item) => ({
    id: generateId(),
    projectId: input.projectId,
    claimId,
    kind: item.kind,
    source: item.source,
    data: serializeEvidenceData(item),
    hash: item.hash?.toLowerCase() ?? null,
    jsonPath: item.jsonPath ?? null,
    expectedValue: item.expectedValue === undefined ? null : encodeJson(item.expectedValue),
    createdAt: now,
  }));

  await db.batch([
    db.insert(claims).values({
      id: claimId,
      projectId: input.projectId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      statement: input.statement,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(claimEvidence).values(evidenceRows),
  ]);

  const claim = await getClaim(db, input.projectId, claimId);
  if (!claim) throw new Error("Claim was not written");

  return claim;
}

export async function listClaims(
  db: DrizzleD1Database,
  projectId: string,
  options: ListClaimsOptions,
): Promise<ListClaimsResult> {
  const cursorValidation = validateClaimCursor(options.cursor);
  if (!cursorValidation.valid) {
    return {
      rows: [],
      nextCursor: null,
      error: {
        code: "INVALID_CURSOR",
        message: cursorValidation.error,
        status: 400 as const,
      },
    };
  }

  const conditions = [eq(claims.projectId, projectId)];

  if (options.cursor) {
    // Composite cursor "<createdAt>.<id>" (tie-break by id) so claims sharing a
    // created_at timestamp are neither skipped nor duplicated across pages.
    const dot = options.cursor.lastIndexOf(".");
    const tsStr = dot === -1 ? options.cursor : options.cursor.slice(0, dot);
    const cursorId = dot === -1 ? undefined : options.cursor.slice(dot + 1);
    const cursorTs = parseInt(tsStr, 10);
    if (!Number.isNaN(cursorTs)) {
      const cursorCond =
        options.order === "desc"
          ? cursorId !== undefined
            ? or(
                lt(claims.createdAt, cursorTs),
                and(eq(claims.createdAt, cursorTs), lt(claims.id, cursorId)),
              )
            : lt(claims.createdAt, cursorTs)
          : cursorId !== undefined
            ? or(
                gt(claims.createdAt, cursorTs),
                and(eq(claims.createdAt, cursorTs), gt(claims.id, cursorId)),
              )
            : gt(claims.createdAt, cursorTs);
      if (cursorCond) conditions.push(cursorCond);
    }
  }

  if (options.subjectType) {
    conditions.push(eq(claims.subjectType, options.subjectType));
  }

  if (options.subjectId) {
    conditions.push(eq(claims.subjectId, options.subjectId));
  }

  const ordering =
    options.order === "desc"
      ? [desc(claims.createdAt), desc(claims.id)]
      : [asc(claims.createdAt), asc(claims.id)];

  const rows = await db
    .select()
    .from(claims)
    .where(and(...conditions))
    .orderBy(...ordering)
    .limit(options.limit);

  const last = rows[rows.length - 1];
  return {
    rows: rows.map(mapClaimRow),
    nextCursor: rows.length === options.limit && last ? `${last.createdAt}.${last.id}` : null,
  };
}

export async function getClaim(
  db: DrizzleD1Database,
  projectId: string,
  claimId: string,
): Promise<ClaimResponse | null> {
  const [claim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.projectId, projectId), eq(claims.id, claimId)))
    .limit(1);

  if (!claim) return null;

  const evidenceRows = await db
    .select()
    .from(claimEvidence)
    .where(and(eq(claimEvidence.projectId, projectId), eq(claimEvidence.claimId, claimId)))
    .orderBy(asc(claimEvidence.createdAt));

  return {
    ...mapClaimRow(claim),
    evidence: evidenceRows.map(mapEvidenceRow),
  };
}

export async function verifyClaim(
  db: DrizzleD1Database,
  projectId: string,
  claimId: string,
): Promise<VerificationRunResponse | null> {
  const claim = await getClaim(db, projectId, claimId);
  if (!claim) return null;

  const evidenceRows = await db
    .select()
    .from(claimEvidence)
    .where(and(eq(claimEvidence.projectId, projectId), eq(claimEvidence.claimId, claimId)))
    .orderBy(asc(claimEvidence.createdAt));

  const results: VerificationEvidenceResult[] = [];
  for (const evidence of evidenceRows) {
    results.push(await verifyEvidence(db, evidence));
  }

  const status: Exclude<ClaimStatus, "pending"> =
    results.length > 0 && results.every((result) => result.passed) ? "verified" : "failed";
  const now = Date.now();
  const runId = generateId();
  const details: VerificationDetails = { results };

  await db.batch([
    db.insert(claimVerificationRuns).values({
      id: runId,
      projectId,
      claimId,
      status,
      details: encodeJson(details),
      createdAt: now,
    }),
    db.update(claims).set({ status, updatedAt: now }).where(eq(claims.id, claimId)),
  ]);

  return {
    id: runId,
    project_id: projectId,
    claim_id: claimId,
    status,
    details,
    created_at: now,
  };
}

async function verifyEvidence(
  db: DrizzleD1Database,
  evidence: typeof claimEvidence.$inferSelect,
): Promise<VerificationEvidenceResult> {
  if (evidence.kind === "text_hash") {
    if (!evidence.data || !evidence.hash) {
      return evidenceResult(evidence, false, "text hash evidence is missing data or hash");
    }

    const actualHash = await sha256Hex(evidence.data);
    return evidenceResult(
      evidence,
      actualHash === evidence.hash.toLowerCase(),
      actualHash === evidence.hash.toLowerCase() ? "hash matched" : "hash mismatch",
    );
  }

  if (evidence.kind === "json_value") {
    return verifyJsonAssertion(evidence, evidence.data, "json value matched");
  }

  const event = await loadStateEvent(db, evidence.projectId, evidence.source);
  if (!event) {
    return evidenceResult(evidence, false, "state event not found");
  }

  if (evidence.hash) {
    const actualHash = await sha256Hex(event.data ?? "");
    return evidenceResult(
      evidence,
      actualHash === evidence.hash.toLowerCase(),
      actualHash === evidence.hash.toLowerCase()
        ? "state event hash matched"
        : "state event hash mismatch",
    );
  }

  return verifyJsonAssertion(evidence, event.data, "state event json value matched");
}

async function loadStateEvent(db: DrizzleD1Database, projectId: string, source: string) {
  const sequence = Number(source);
  const sourceCondition =
    Number.isInteger(sequence) && sequence > 0
      ? eq(stateEvents.sequence, sequence)
      : eq(stateEvents.id, source);

  const [event] = await db
    .select()
    .from(stateEvents)
    .where(and(eq(stateEvents.projectId, projectId), sourceCondition))
    .limit(1);

  return event ?? null;
}

function verifyJsonAssertion(
  evidence: typeof claimEvidence.$inferSelect,
  rawData: string | null,
  successMessage: string,
): VerificationEvidenceResult {
  if (!rawData || !evidence.jsonPath || evidence.expectedValue === null) {
    return evidenceResult(
      evidence,
      false,
      "json evidence is missing data, path, or expected value",
    );
  }

  const data = decodeJson(rawData, undefined);
  const expected = decodeJson(evidence.expectedValue, undefined);
  if (data === undefined || expected === undefined) {
    return evidenceResult(evidence, false, "json evidence contains invalid JSON");
  }

  const actual = readJsonPath(data, evidence.jsonPath);
  if (actual === undefined) {
    return evidenceResult(evidence, false, "json path did not resolve");
  }

  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  return evidenceResult(evidence, passed, passed ? successMessage : "json value mismatch");
}

function evidenceResult(
  evidence: typeof claimEvidence.$inferSelect,
  passed: boolean,
  message: string,
): VerificationEvidenceResult {
  return {
    evidence_id: evidence.id,
    kind: evidence.kind,
    source: evidence.source,
    passed,
    message,
  };
}

function mapClaimRow(row: typeof claims.$inferSelect): ClaimResponse {
  return {
    id: row.id,
    project_id: row.projectId,
    subject_type: row.subjectType,
    subject_id: row.subjectId,
    statement: row.statement,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapEvidenceRow(row: typeof claimEvidence.$inferSelect): EvidenceResponse {
  return {
    id: row.id,
    project_id: row.projectId,
    claim_id: row.claimId,
    kind: row.kind,
    source: row.source,
    data: row.kind === "text_hash" ? row.data : decodeJson(row.data, null),
    hash: row.hash,
    json_path: row.jsonPath,
    expected_value: decodeJson(row.expectedValue, null),
    created_at: row.createdAt,
  };
}

function serializeEvidenceData(input: CreateEvidenceInput): string | null {
  if (input.kind === "state_event") return null;
  if (input.kind === "text_hash") return String(input.data ?? "");
  return encodeJson(input.data);
}
