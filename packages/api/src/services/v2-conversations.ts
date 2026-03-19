// ---------------------------------------------------------------------------
// V2 Conversations service — Business logic for V2 conversation API endpoints
// ---------------------------------------------------------------------------

import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, conversationTags, messages } from "../db/schema";
import { generateId } from "../lib/id";
import { serializeMetadata } from "../lib/serialization";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateConversationInput {
  projectId: string;
  externalId?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  inputMessages?: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    metadata?: Record<string, unknown> | null;
    token_count?: number;
  }>;
}

export interface CreateConversationResult {
  conversationId: string;
  projectId: string;
  externalId: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  messageCount: number;
  tokenCount: number;
  createdAt: number;
  updatedAt: number;
  error?: { code: string; message: string; status: 409 };
}

export interface ListConversationsOptions {
  limit: number;
  cursor?: string;
  order: "asc" | "desc";
  tag?: string;
}

export interface ListConversationsResult {
  rows: (typeof conversations.$inferSelect)[];
  nextCursor: string | null;
  totalCount: number;
  error?: { code: string; message: string; status: 400 };
}

export interface UpdateConversationInput {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface CursorValidationError {
  valid: false;
  error: string;
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate cursor parameter for pagination.
 * Returns { valid: true } if valid, or { valid: false, error: string } if invalid.
 */
export function validateCursor(
  cursorParam: string | undefined,
): CursorValidationError | { valid: true } {
  if (cursorParam === undefined) {
    return { valid: true };
  }

  const cursorNum = Number(cursorParam);
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

// ---------------------------------------------------------------------------
// CRUD Service Functions
// ---------------------------------------------------------------------------

/**
 * Create a new conversation with optional initial messages.
 * Handles unique constraint violations for external_id.
 * V2: Messages are NOT included in the response for efficiency.
 */
export async function createConversation(
  db: DrizzleD1Database,
  input: CreateConversationInput,
): Promise<CreateConversationResult> {
  const { projectId, externalId, title, metadata, inputMessages } = input;
  const now = Date.now();

  const msgCount = inputMessages?.length ?? 0;
  const tokenCount = inputMessages?.reduce((sum, m) => sum + (m.token_count ?? 0), 0) ?? 0;

  const conversationId = generateId();

  try {
    await db.insert(conversations).values({
      id: conversationId,
      projectId,
      externalId: externalId ?? null,
      title: title ?? null,
      metadata: serializeMetadata(metadata),
      messageCount: msgCount,
      tokenCount,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (externalId && msg.toLowerCase().includes("unique")) {
      return {
        conversationId: "",
        projectId,
        externalId: externalId ?? null,
        title: title ?? null,
        metadata: metadata ?? null,
        messageCount: 0,
        tokenCount: 0,
        createdAt: now,
        updatedAt: now,
        error: {
          code: "CONFLICT",
          message: "A conversation with this external_id already exists",
          status: 409 as const,
        },
      };
    }
    throw err;
  }

  // Insert messages if provided
  if (inputMessages && inputMessages.length > 0) {
    const rows = inputMessages.map((m) => ({
      id: generateId(),
      conversationId,
      role: m.role as "system" | "user" | "assistant" | "tool",
      content: m.content,
      metadata: serializeMetadata(m.metadata),
      tokenCount: m.token_count ?? 0,
      createdAt: now,
    }));

    await db.insert(messages).values(rows);
  }

  return {
    conversationId,
    projectId,
    externalId: externalId ?? null,
    title: title ?? null,
    metadata: metadata ?? null,
    messageCount: msgCount,
    tokenCount,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * List conversations with pagination, tag filtering, and total count.
 * V2: Includes total count for the project.
 */
export async function listConversations(
  db: DrizzleD1Database,
  cache: KVNamespace | undefined,
  projectId: string,
  options: ListConversationsOptions,
): Promise<ListConversationsResult> {
  const { limit, cursor, order, tag } = options;

  // Validate cursor if provided
  const cursorValidation = validateCursor(cursor);
  if (!cursorValidation.valid) {
    return {
      rows: [],
      nextCursor: null,
      totalCount: 0,
      error: {
        code: "INVALID_CURSOR",
        message: cursorValidation.error,
        status: 400 as const,
      },
    };
  }

  const conditions = [eq(conversations.projectId, projectId)];

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

  let rows: (typeof conversations.$inferSelect)[];

  if (tag) {
    // Filter conversations that have the requested tag via an inner join
    rows = await db
      .select({
        id: conversations.id,
        projectId: conversations.projectId,
        externalId: conversations.externalId,
        title: conversations.title,
        metadata: conversations.metadata,
        messageCount: conversations.messageCount,
        tokenCount: conversations.tokenCount,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .innerJoin(
        conversationTags,
        and(eq(conversationTags.conversationId, conversations.id), eq(conversationTags.tag, tag)),
      )
      .where(and(...conditions))
      .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
      .limit(limit);
  } else {
    rows = await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(order === "desc" ? desc(conversations.updatedAt) : asc(conversations.updatedAt))
      .limit(limit);
  }

  // Get total count with caching
  const cacheKey = `count:conversations:${projectId}`;
  let count = 0;

  if (cache) {
    const cached = await cache.get(cacheKey, "json");
    if (cached) count = cached as number;
  }

  if (!count) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.projectId, projectId));
    count = countResult?.count ?? 0;

    if (cache) {
      await cache.put(cacheKey, JSON.stringify(count), { expirationTtl: 60 });
    }
  }

  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].updatedAt) : null;

  return { rows, nextCursor, totalCount: count };
}

/**
 * Update a conversation's title and/or metadata.
 * V2: Uses PATCH instead of PUT.
 */
export async function updateConversation(
  db: DrizzleD1Database,
  conversationId: string,
  input: UpdateConversationInput,
): Promise<{
  id: string;
  projectId: string;
  externalId: string | null;
  title: string | null;
  metadata: string | null;
  messageCount: number;
  tokenCount: number;
  createdAt: number;
  updatedAt: number;
}> {
  const { title, metadata } = input;
  const now = Date.now();

  const updates: Partial<typeof conversations.$inferInsert> = {
    updatedAt: now,
  };
  if (title !== undefined) updates.title = title;
  if (metadata !== undefined) updates.metadata = serializeMetadata(metadata);

  await db.update(conversations).set(updates).where(eq(conversations.id, conversationId));

  // Fetch and return the updated conversation
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return conversation as typeof conversations.$inferSelect;
}

/**
 * Delete a conversation and its messages.
 * Uses batch delete for atomic operation.
 */
export async function deleteConversation(
  db: DrizzleD1Database,
  conversationId: string,
): Promise<void> {
  // Batch delete: messages first, then conversation
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, conversationId)),
    db.delete(conversations).where(eq(conversations.id, conversationId)),
  ]);
}

/**
 * Get conversation count for a project.
 * Used for pagination metadata in list responses.
 */
export async function getConversationCount(
  db: DrizzleD1Database,
  projectId: string,
): Promise<number> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(eq(conversations.projectId, projectId));
  return countResult?.count ?? 0;
}
