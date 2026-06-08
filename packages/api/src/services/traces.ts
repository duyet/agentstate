import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, messages } from "../db/schema";
import { generateId } from "../lib/id";
import {
  deserializeConversationFull,
  deserializeMessage,
  serializeMetadata,
} from "../lib/serialization";
import { buildObservationTree } from "../lib/trace-tree";
import type { IngestTraceInput } from "../lib/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListTracesOptions {
  limit: number;
  cursor?: string;
  order: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// ingestTrace
// ---------------------------------------------------------------------------

/**
 * Ingest a complete trace: create a conversation and insert all observations.
 *
 * Handles parent_message_id resolution: if a client sends `parent_message_id: "$1"`
 * and "$1" refers to another observation in the same batch (by local reference),
 * it is resolved to the generated ID of that observation.
 */
export async function ingestTrace(
  db: DrizzleD1Database,
  projectId: string,
  data: IngestTraceInput,
) {
  const { trace, observations } = data;
  const now = Date.now();

  // Compute aggregate counters from observations
  const tokenCount = observations.reduce((sum, o) => sum + (o.token_count ?? 0), 0);
  const totalCost = observations.reduce((sum, o) => sum + (o.cost_microdollars ?? 0), 0);
  const totalTokens = observations.reduce(
    (sum, o) => sum + (o.input_tokens ?? 0) + (o.output_tokens ?? 0),
    0,
  );

  const conversationId = generateId();

  // Create the conversation (the "trace")
  await db.insert(conversations).values({
    id: conversationId,
    projectId,
    externalId: trace.external_id ?? null,
    title: trace.title ?? null,
    metadata: serializeMetadata(trace.metadata),
    messageCount: observations.length,
    tokenCount,
    totalCostMicrodollars: totalCost,
    totalTokens,
    createdAt: now,
    updatedAt: now,
  });

  // Pre-generate IDs for all observations so we can resolve parent refs within the batch
  const idMap = new Map<string, string>();
  const messageRows = observations.map((o) => {
    const id = generateId();
    return {
      id,
      conversationId,
      role: o.role as "system" | "user" | "assistant" | "tool",
      content: o.content,
      metadata: serializeMetadata(o.metadata),
      tokenCount: o.token_count ?? 0,
      model: o.model ?? null,
      inputTokens: o.input_tokens ?? null,
      outputTokens: o.output_tokens ?? null,
      costMicrodollars: o.cost_microdollars ?? null,
      parentMessageId: o.parent_message_id ?? null,
      observationType: o.observation_type,
      startTime: o.start_time ?? null,
      endTime: o.end_time ?? null,
      status: o.status ?? null,
      level: o.level ?? null,
      createdAt: now,
    };
  });

  // Build index: observation index -> generated id, for "$N" resolution
  // Every observation gets mapped so that any "$N" reference can be resolved.
  observations.forEach((_o, i) => {
    idMap.set(`$${i + 1}`, messageRows[i].id);
  });

  // Resolve parent_message_id references within the batch
  // If parent_message_id matches "$N" pattern and maps to another observation in the batch, resolve it
  for (let i = 0; i < observations.length; i++) {
    const parentId = observations[i].parent_message_id;
    if (parentId && idMap.has(parentId)) {
      messageRows[i].parentMessageId = idMap.get(parentId)!;
    }
  }

  await db.insert(messages).values(messageRows);

  const conversation = {
    id: conversationId,
    projectId,
    externalId: trace.external_id ?? null,
    title: trace.title ?? null,
    metadata: serializeMetadata(trace.metadata),
    messageCount: observations.length,
    tokenCount,
    totalCostMicrodollars: totalCost,
    totalTokens,
    createdAt: now,
    updatedAt: now,
  } as typeof conversations.$inferSelect;

  return {
    conversation,
    observations: messageRows as (typeof messages.$inferSelect)[],
  };
}

// ---------------------------------------------------------------------------
// listTraces
// ---------------------------------------------------------------------------

/**
 * List traces (conversations that contain at least one observation).
 * Uses cursor-based pagination on updated_at.
 */
export async function listTraces(
  db: DrizzleD1Database,
  projectId: string,
  opts: ListTracesOptions,
) {
  const { limit, cursor, order } = opts;

  // Build base conditions: project-scoped + has observations
  const conditions = [
    eq(conversations.projectId, projectId),
    sql`${conversations.id} IN (SELECT DISTINCT ${messages.conversationId} FROM ${messages} WHERE ${messages.observationType} IS NOT NULL)`,
  ];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!Number.isNaN(cursorTs)) {
      conditions.push(
        order === "desc"
          ? lt(conversations.updatedAt, cursorTs)
          : gt(conversations.updatedAt, cursorTs),
      );
    }
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
    .limit(limit);

  const hasMore = rows.length === limit;
  const nextCursor = hasMore ? String(rows[rows.length - 1].updatedAt) : null;

  return {
    data: rows.map(deserializeConversationFull),
    has_more: hasMore,
    next_cursor: nextCursor,
  };
}

// ---------------------------------------------------------------------------
// getTraceTree
// ---------------------------------------------------------------------------

/**
 * Get a single trace with its observations arranged as a tree.
 */
export async function getTraceTree(db: DrizzleD1Database, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) return null;

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const deserializedMsgs = msgs.map(deserializeMessage);
  const tree = buildObservationTree(deserializedMsgs);

  return {
    ...deserializeConversationFull(conversation),
    observations: tree,
  };
}
