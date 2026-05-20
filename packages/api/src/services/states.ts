import { generateId } from "../lib/id";
import {
  decodeJson,
  encodeJson,
  isSupportedJsonPath,
  readJsonPath,
  sha256Hex,
} from "../lib/state-json";
import type { QueryStatesInput, UpsertStateInput } from "../lib/validation";

const MAX_QUERY_SCAN_PAGES = 10;

export interface StateResponse {
  state_key: string;
  agent_id: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  tags: string[];
  latest_sequence: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface StateEventResponse {
  sequence: number;
  id: string;
  state_key: string;
  agent_id: string;
  event_type: "upsert" | "delete";
  data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  tags: string[];
  idempotency_key: string | null;
  created_at: number;
}

export interface StateMutationResult {
  status: number;
  body: StateResponse | { deleted: true; event: StateEventResponse };
  event: StateEventResponse;
}

export interface StateServiceError {
  code: string;
  message: string;
  status: 400 | 404 | 409;
}

type StateRow = {
  state_key: string;
  agent_id: string;
  data: string;
  metadata: string | null;
  tags: string;
  latest_sequence: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type StateEventRow = {
  sequence: number;
  id: string;
  state_key: string;
  agent_id: string;
  event_type: "upsert" | "delete";
  data: string | null;
  metadata: string | null;
  tags: string;
  idempotency_key: string | null;
  created_at: number;
};

type IdempotencyRow = {
  request_hash: string;
  response_status: number;
  response_body: string;
};

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set(tags ?? [])].sort();
}

export function mapStateRow(row: StateRow): StateResponse {
  return {
    state_key: row.state_key,
    agent_id: row.agent_id,
    data: decodeJson<Record<string, unknown>>(row.data, {}),
    metadata: decodeJson<Record<string, unknown> | null>(row.metadata, null),
    tags: decodeJson<string[]>(row.tags, []),
    latest_sequence: row.latest_sequence,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export function mapStateEventRow(row: StateEventRow): StateEventResponse {
  return {
    sequence: row.sequence,
    id: row.id,
    state_key: row.state_key,
    agent_id: row.agent_id,
    event_type: row.event_type,
    data: decodeJson<Record<string, unknown> | null>(row.data, null),
    metadata: decodeJson<Record<string, unknown> | null>(row.metadata, null),
    tags: decodeJson<string[]>(row.tags, []),
    idempotency_key: row.idempotency_key,
    created_at: row.created_at,
  };
}

export async function buildIdempotencyHash(method: string, stateKey: string, body: unknown) {
  return sha256Hex(`${method}:${stateKey}:${encodeJson(body)}`);
}

export async function readIdempotency(
  d1: D1Database,
  projectId: string,
  key: string | undefined,
  requestHash: string,
): Promise<{ replay?: Response; error?: StateServiceError }> {
  if (!key) return {};

  const row = await d1
    .prepare(
      "SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE project_id = ? AND key = ? LIMIT 1",
    )
    .bind(projectId, key)
    .first<IdempotencyRow>();

  if (!row) return {};

  if (row.request_hash !== requestHash) {
    return {
      error: {
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency-Key was already used for a different request",
        status: 409,
      },
    };
  }

  return {
    replay: new Response(row.response_body, {
      status: row.response_status,
      headers: { "Content-Type": "application/json", "Idempotency-Replayed": "true" },
    }),
  };
}

export async function storeIdempotency(
  d1: D1Database,
  projectId: string,
  key: string | undefined,
  requestHash: string,
  status: number,
  body: unknown,
) {
  if (!key) return;

  await d1
    .prepare(
      "INSERT OR IGNORE INTO idempotency_keys (id, project_id, key, request_hash, response_status, response_body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(generateId(), projectId, key, requestHash, status, encodeJson(body), Date.now())
    .run();
}

export async function getLatestState(
  d1: D1Database,
  projectId: string,
  stateKey: string,
): Promise<StateResponse | null> {
  const row = await d1
    .prepare(
      "SELECT state_key, agent_id, data, metadata, tags, latest_sequence, created_at, updated_at, deleted_at FROM agent_states WHERE project_id = ? AND state_key = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(projectId, stateKey)
    .first<StateRow>();

  return row ? mapStateRow(row) : null;
}

export async function getHistoricalState(
  d1: D1Database,
  projectId: string,
  stateKey: string,
  atSequence?: number,
  atTime?: number,
): Promise<StateResponse | null> {
  const conditions = ["project_id = ?", "state_key = ?"];
  const params: unknown[] = [projectId, stateKey];

  if (atSequence !== undefined) {
    conditions.push("sequence <= ?");
    params.push(atSequence);
  }
  if (atTime !== undefined) {
    conditions.push("created_at <= ?");
    params.push(atTime);
  }

  const row = await d1
    .prepare(
      `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
       FROM state_events
       WHERE ${conditions.join(" AND ")}
       ORDER BY sequence DESC
       LIMIT 1`,
    )
    .bind(...params)
    .first<StateEventRow>();

  if (!row || row.event_type === "delete" || !row.data) return null;

  return {
    state_key: row.state_key,
    agent_id: row.agent_id,
    data: decodeJson<Record<string, unknown>>(row.data, {}),
    metadata: decodeJson<Record<string, unknown> | null>(row.metadata, null),
    tags: decodeJson<string[]>(row.tags, []),
    latest_sequence: row.sequence,
    created_at: row.created_at,
    updated_at: row.created_at,
    deleted_at: null,
  };
}

export async function listStateEvents(
  d1: D1Database,
  projectId: string,
  stateKey: string,
  after: number,
  limit: number,
): Promise<StateEventResponse[]> {
  const result = await d1
    .prepare(
      `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
       FROM state_events
       WHERE project_id = ? AND state_key = ? AND sequence > ?
       ORDER BY sequence ASC
       LIMIT ?`,
    )
    .bind(projectId, stateKey, after, limit)
    .all<StateEventRow>();

  return (result.results ?? []).map(mapStateEventRow);
}

async function enforceLease(
  d1: D1Database,
  projectId: string,
  stateKey: string,
  leaseId: string | undefined,
): Promise<StateServiceError | null> {
  const active = await d1
    .prepare(
      `SELECT id FROM state_leases
       WHERE project_id = ? AND state_key = ? AND released_at IS NULL AND expires_at > ?
       ORDER BY fencing_token DESC
       LIMIT 1`,
    )
    .bind(projectId, stateKey, Date.now())
    .first<{ id: string }>();

  if (!active) return null;
  if (!leaseId) {
    return { code: "LEASE_REQUIRED", message: "Active lease requires lease_id", status: 409 };
  }
  if (active.id !== leaseId) {
    return { code: "LEASE_CONFLICT", message: "lease_id does not match active lease", status: 409 };
  }
  return null;
}

async function loadEventById(d1: D1Database, eventId: string): Promise<StateEventResponse> {
  const row = await d1
    .prepare(
      `SELECT sequence, id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at
       FROM state_events
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(eventId)
    .first<StateEventRow>();

  if (!row) throw new Error("State event was not written");
  return mapStateEventRow(row);
}

export async function upsertState(
  d1: D1Database,
  projectId: string,
  stateKey: string,
  input: UpsertStateInput,
  idempotencyKey?: string,
): Promise<{ result?: StateMutationResult; error?: StateServiceError }> {
  const leaseError = await enforceLease(d1, projectId, stateKey, input.lease_id);
  if (leaseError) return { error: leaseError };

  const now = Date.now();
  const eventId = generateId();
  const stateId = generateId();
  const snapshotId = generateId();
  const tags = normalizeTags(input.tags);
  const data = encodeJson(input.data);
  const metadata = input.metadata === undefined ? null : encodeJson(input.metadata);
  const tagsJson = encodeJson(tags);

  const statements = [
    d1
      .prepare(
        `INSERT INTO state_events (id, project_id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at)
         VALUES (?, ?, ?, ?, 'upsert', ?, ?, ?, ?, ?)`,
      )
      .bind(
        eventId,
        projectId,
        stateKey,
        input.agent_id,
        data,
        metadata,
        tagsJson,
        idempotencyKey ?? null,
        now,
      ),
    d1
      .prepare(
        `INSERT INTO agent_states (id, project_id, state_key, agent_id, data, metadata, tags, latest_sequence, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT sequence FROM state_events WHERE id = ?), NULL, ?, ?)
         ON CONFLICT(project_id, state_key) DO UPDATE SET
           agent_id = excluded.agent_id,
           data = excluded.data,
           metadata = excluded.metadata,
           tags = excluded.tags,
           latest_sequence = excluded.latest_sequence,
           deleted_at = NULL,
           updated_at = excluded.updated_at`,
      )
      .bind(
        stateId,
        projectId,
        stateKey,
        input.agent_id,
        data,
        metadata,
        tagsJson,
        eventId,
        now,
        now,
      ),
    d1
      .prepare("DELETE FROM state_tags WHERE project_id = ? AND state_key = ?")
      .bind(projectId, stateKey),
    ...tags.map((tag) =>
      d1
        .prepare(
          "INSERT INTO state_tags (id, project_id, state_key, tag, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(generateId(), projectId, stateKey, tag, now),
    ),
    d1
      .prepare(
        `INSERT INTO state_snapshots (id, project_id, state_key, sequence, data, metadata, tags, deleted_at, created_at)
         VALUES (?, ?, ?, (SELECT sequence FROM state_events WHERE id = ?), ?, ?, ?, NULL, ?)`,
      )
      .bind(snapshotId, projectId, stateKey, eventId, data, metadata, tagsJson, now),
  ];

  await d1.batch(statements);
  const event = await loadEventById(d1, eventId);
  const state = await getLatestState(d1, projectId, stateKey);
  if (!state) throw new Error("State was not written");
  return { result: { status: 200, body: state, event } };
}

export async function deleteState(
  d1: D1Database,
  projectId: string,
  stateKey: string,
  leaseId?: string,
): Promise<{ result?: StateMutationResult; error?: StateServiceError }> {
  const existing = await d1
    .prepare(
      "SELECT state_key, agent_id, data, metadata, tags, latest_sequence, created_at, updated_at, deleted_at FROM agent_states WHERE project_id = ? AND state_key = ? AND deleted_at IS NULL LIMIT 1",
    )
    .bind(projectId, stateKey)
    .first<StateRow>();

  if (!existing) {
    return { error: { code: "NOT_FOUND", message: "State not found", status: 404 } };
  }

  const leaseError = await enforceLease(d1, projectId, stateKey, leaseId);
  if (leaseError) return { error: leaseError };

  const now = Date.now();
  const eventId = generateId();
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO state_events (id, project_id, state_key, agent_id, event_type, data, metadata, tags, idempotency_key, created_at)
         VALUES (?, ?, ?, ?, 'delete', NULL, ?, ?, NULL, ?)`,
      )
      .bind(eventId, projectId, stateKey, existing.agent_id, existing.metadata, existing.tags, now),
    d1
      .prepare(
        `UPDATE agent_states
         SET latest_sequence = (SELECT sequence FROM state_events WHERE id = ?), deleted_at = ?, updated_at = ?
         WHERE project_id = ? AND state_key = ?`,
      )
      .bind(eventId, now, now, projectId, stateKey),
    d1
      .prepare("DELETE FROM state_tags WHERE project_id = ? AND state_key = ?")
      .bind(projectId, stateKey),
    d1
      .prepare(
        `INSERT INTO state_snapshots (id, project_id, state_key, sequence, data, metadata, tags, deleted_at, created_at)
         VALUES (?, ?, ?, (SELECT sequence FROM state_events WHERE id = ?), NULL, ?, ?, ?, ?)`,
      )
      .bind(generateId(), projectId, stateKey, eventId, existing.metadata, existing.tags, now, now),
  ]);

  const event = await loadEventById(d1, eventId);
  return { result: { status: 200, body: { deleted: true, event }, event } };
}

function buildQueryPredicates(
  input: QueryStatesInput,
): NonNullable<QueryStatesInput["predicates"]> {
  const predicates = [...(input.predicates ?? [])];
  if (input.json_path !== undefined) {
    predicates.push({ path: input.json_path, equals: input.json_equals });
  }

  return predicates;
}

function matchesPredicates(
  state: StateResponse,
  predicates: NonNullable<QueryStatesInput["predicates"]>,
): boolean {
  return predicates.every((predicate) => {
    if (!isSupportedJsonPath(predicate.path)) return false;
    return (
      JSON.stringify(readJsonPath(state.data, predicate.path)) === JSON.stringify(predicate.equals)
    );
  });
}

export async function queryStates(
  d1: D1Database,
  projectId: string,
  input: QueryStatesInput,
): Promise<{ rows?: StateResponse[]; nextCursor?: string | null; error?: StateServiceError }> {
  const limit = input.limit ?? 50;
  const predicates = buildQueryPredicates(input);
  if (predicates.some((predicate) => !isSupportedJsonPath(predicate.path))) {
    return { error: { code: "BAD_REQUEST", message: "Unsupported JSON path", status: 400 } };
  }

  if (input.at_sequence !== undefined || input.at_time !== undefined) {
    const latestConditions = ["project_id = ?"];
    const latestParams: unknown[] = [projectId];
    if (input.at_sequence !== undefined) {
      latestConditions.push("sequence <= ?");
      latestParams.push(input.at_sequence);
    }
    if (input.at_time !== undefined) {
      latestConditions.push("created_at <= ?");
      latestParams.push(input.at_time);
    }

    const rows: StateResponse[] = [];
    let cursor = Number(input.cursor);
    const pageSize = Math.max(limit * 5, limit);
    let scannedPages = 0;

    while (rows.length < limit && scannedPages < MAX_QUERY_SCAN_PAGES) {
      scannedPages++;
      const pageConditions = ["e.project_id = ?"];
      const pageParams: unknown[] = [projectId];
      if (Number.isFinite(cursor) && cursor > 0) {
        pageConditions.push("e.sequence < ?");
        pageParams.push(cursor);
      }

      const result = await d1
        .prepare(
          `SELECT e.sequence, e.id, e.state_key, e.agent_id, e.event_type, e.data, e.metadata, e.tags, e.idempotency_key, e.created_at
           FROM state_events e
           INNER JOIN (
             SELECT state_key, MAX(sequence) AS sequence
             FROM state_events
             WHERE ${latestConditions.join(" AND ")}
             GROUP BY state_key
           ) latest ON latest.state_key = e.state_key AND latest.sequence = e.sequence
           WHERE ${pageConditions.join(" AND ")}
           ORDER BY e.sequence DESC
           LIMIT ?`,
        )
        .bind(...latestParams, ...pageParams, pageSize)
        .all<StateEventRow>();

      const candidates = result.results ?? [];
      if (!candidates.length) return { rows, nextCursor: null };

      for (const row of candidates) {
        if (row.event_type === "delete" || !row.data) continue;

        const state = {
          state_key: row.state_key,
          agent_id: row.agent_id,
          data: decodeJson<Record<string, unknown>>(row.data, {}),
          metadata: decodeJson<Record<string, unknown> | null>(row.metadata, null),
          tags: decodeJson<string[]>(row.tags, []),
          latest_sequence: row.sequence,
          created_at: row.created_at,
          updated_at: row.created_at,
          deleted_at: null,
        };
        if (!stateMatchesFilters(state, input, predicates)) continue;

        rows.push(state);
        if (rows.length === limit) return { rows, nextCursor: String(row.sequence) };
      }

      if (candidates.length < pageSize) return { rows, nextCursor: null };
      cursor = candidates[candidates.length - 1].sequence;
    }

    return {
      rows,
      nextCursor: Number.isFinite(cursor) && cursor > 0 ? String(cursor) : null,
    };
  }

  const conditions = ["project_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [projectId];

  if (input.agent_id) {
    conditions.push("agent_id = ?");
    params.push(input.agent_id);
  }
  if (input.updated_after !== undefined) {
    conditions.push("updated_at >= ?");
    params.push(input.updated_after);
  }
  if (input.updated_before !== undefined) {
    conditions.push("updated_at <= ?");
    params.push(input.updated_before);
  }
  const rows: StateResponse[] = [];
  let cursor = Number(input.cursor);
  const pageSize = Math.max(limit * 5, limit);
  let scannedPages = 0;

  while (rows.length < limit && scannedPages < MAX_QUERY_SCAN_PAGES) {
    scannedPages++;
    const pageConditions = [...conditions];
    const pageParams = [...params];
    if (Number.isFinite(cursor) && cursor > 0) {
      pageConditions.push("latest_sequence < ?");
      pageParams.push(cursor);
    }

    const result = await d1
      .prepare(
        `SELECT state_key, agent_id, data, metadata, tags, latest_sequence, created_at, updated_at, deleted_at
         FROM agent_states
         WHERE ${pageConditions.join(" AND ")}
         ORDER BY latest_sequence DESC
         LIMIT ?`,
      )
      .bind(...pageParams, pageSize)
      .all<StateRow>();

    const page = (result.results ?? []).map(mapStateRow);
    if (!page.length) return { rows, nextCursor: null };

    for (const state of page) {
      if (!stateMatchesFilters(state, input, predicates)) continue;

      rows.push(state);
      if (rows.length === limit) return { rows, nextCursor: String(state.latest_sequence) };
    }

    if (page.length < pageSize) return { rows, nextCursor: null };
    cursor = page[page.length - 1].latest_sequence;
  }

  return {
    rows,
    nextCursor: Number.isFinite(cursor) && cursor > 0 ? String(cursor) : null,
  };
}

function stateMatchesFilters(
  state: StateResponse,
  input: QueryStatesInput,
  predicates: NonNullable<QueryStatesInput["predicates"]>,
): boolean {
  if (input.agent_id && state.agent_id !== input.agent_id) return false;
  if (input.tags?.some((tag) => !state.tags.includes(tag))) return false;
  if (input.updated_after !== undefined && state.updated_at < input.updated_after) return false;
  if (input.updated_before !== undefined && state.updated_at > input.updated_before) return false;
  return matchesPredicates(state, predicates);
}
