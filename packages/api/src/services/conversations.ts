import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { conversations, conversationTags, messages, webhooks } from "../db/schema";
import { generateId } from "../lib/id";
import { serializeMetadata } from "../lib/serialization";
import { TagSchema } from "../lib/validation";

// ---------------------------------------------------------------------------
// Field Selection Types and Utilities
// ---------------------------------------------------------------------------

/** Valid field names for conversation responses */
const VALID_CONVERSATION_FIELDS = [
  "id",
  "project_id",
  "external_id",
  "title",
  "metadata",
  "message_count",
  "token_count",
  "created_at",
  "updated_at",
  "messages",
] as const;

type ConversationFieldName = (typeof VALID_CONVERSATION_FIELDS)[number];

/**
 * Parse and validate the fields query parameter.
 * Returns null if no fields specified (return all fields).
 * Returns array of field names if valid.
 * Throws error if invalid field names found.
 */
export function parseFieldsParam(
  fieldsStr: string | undefined | null,
): ConversationFieldName[] | null {
  if (!fieldsStr) return null;

  // Handle special case: !messages means "exclude messages"
  if (fieldsStr === "!messages") {
    return VALID_CONVERSATION_FIELDS.filter((f) => f !== "messages");
  }

  const fields = fieldsStr.split(",").map((f) => f.trim() as ConversationFieldName);

  // Validate all field names
  const invalidFields = fields.filter((f) => !VALID_CONVERSATION_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    throw new Error(
      `Invalid field(s): ${invalidFields.join(", ")}. Valid fields: ${VALID_CONVERSATION_FIELDS.join(", ")}`,
    );
  }

  return fields;
}

/**
 * Filter a response object to only include requested fields.
 * If fields is null, returns all fields.
 */
export function filterResponse<T extends Record<string, unknown>>(
  data: T,
  fields: ConversationFieldName[] | null,
): T {
  if (!fields) return data;

  const filtered = {} as T;
  for (const field of fields) {
    if (field in data) {
      (filtered as Record<string, unknown>)[field] = data[field];
    }
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Service Types
// ---------------------------------------------------------------------------

export interface ListConversationsOptions {
  limit: number;
  cursor?: string;
  order: "asc" | "desc";
  tag?: string;
}

export interface CreateConversationOptions {
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

// ---------------------------------------------------------------------------
// CRUD Service Functions
// ---------------------------------------------------------------------------

/**
 * Create a new conversation with optional initial messages.
 * Handles unique constraint violations for external_id.
 */
export async function createConversation(
  db: any,
  options: CreateConversationOptions,
  executionCtx: any,
): Promise<{
  conversation: typeof conversations.$inferSelect;
  messages: (typeof messages.$inferSelect)[];
  error?: { code: string; message: string; status: 409 };
}> {
  const { projectId, externalId, title, metadata, inputMessages } = options;
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
        conversation: {} as any,
        messages: [],
        error: {
          code: "CONFLICT",
          message: "A conversation with this external_id already exists",
          status: 409 as const,
        },
      };
    }
    throw err;
  }

  let messageRows: (typeof messages.$inferSelect)[] = [];

  if (inputMessages && inputMessages.length > 0) {
    const rows = inputMessages.map((m) => ({
      id: generateId(),
      conversationId,
      role: m.role,
      content: m.content,
      metadata: serializeMetadata(m.metadata),
      tokenCount: m.token_count ?? 0,
      createdAt: now,
    }));

    await db.insert(messages).values(rows);
    messageRows = rows as (typeof messages.$inferSelect)[];
  }

  // Trigger webhooks for conversation.created event
  await triggerConversationCreatedWebhook(
    db,
    executionCtx,
    projectId,
    conversationId,
    externalId ?? null,
    title ?? null,
    msgCount,
    tokenCount,
    now,
  );

  return {
    conversation: {
      id: conversationId,
      projectId,
      externalId: externalId ?? null,
      title: title ?? null,
      metadata: serializeMetadata(metadata),
      messageCount: msgCount,
      tokenCount,
      createdAt: now,
      updatedAt: now,
    } as typeof conversations.$inferSelect,
    messages: messageRows,
  };
}

/**
 * List conversations with pagination and tag filtering.
 */
export async function listConversations(
  db: any,
  projectId: string,
  options: ListConversationsOptions,
): Promise<{
  rows: (typeof conversations.$inferSelect)[];
  nextCursor: string | null;
  error?: { code: string; message: string; status: 400 };
}> {
  const { limit, cursor, order, tag } = options;

  // Validate cursor if provided
  if (cursor !== undefined) {
    const cursorNum = Number(cursor);
    if (
      Number.isNaN(cursorNum) ||
      !Number.isFinite(cursorNum) ||
      cursorNum < 0 ||
      cursorNum > Number.MAX_SAFE_INTEGER
    ) {
      return {
        rows: [],
        nextCursor: null,
        error: {
          code: "INVALID_CURSOR",
          message: "Cursor must be a valid positive number (Unix timestamp in milliseconds)",
          status: 400 as const,
        },
      };
    }
  }

  // Validate tag format
  if (tag !== undefined) {
    const parsedTag = TagSchema.safeParse(tag);
    if (!parsedTag.success) {
      return {
        rows: [],
        nextCursor: null,
        error: {
          code: "INVALID_TAG",
          message: parsedTag.error.errors[0]?.message ?? "Invalid tag format",
          status: 400 as const,
        },
      };
    }
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

  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].updatedAt) : null;

  return { rows, nextCursor };
}

/**
 * Get a single conversation with optional messages.
 */
export async function getConversation(
  db: any,
  conversationId: string,
  includeMessages: boolean,
): Promise<{
  conversation: typeof conversations.$inferSelect;
  messages: (typeof messages.$inferSelect)[];
}> {
  const msgs =
    includeMessages &&
    (await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt)));

  return {
    conversation: {} as typeof conversations.$inferSelect,
    messages: (msgs ?? []) as (typeof messages.$inferSelect)[],
  };
}

/**
 * Update a conversation's title and/or metadata.
 */
export async function updateConversation(
  db: any,
  conversationId: string,
  updates: {
    title?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<typeof conversations.$inferSelect> {
  const now = Date.now();
  const updateData: Partial<typeof conversations.$inferInsert> = { updatedAt: now };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.metadata !== undefined) updateData.metadata = serializeMetadata(updates.metadata);

  await db.update(conversations).set(updateData).where(eq(conversations.id, conversationId));

  return {
    id: conversationId,
    ...updateData,
  } as typeof conversations.$inferSelect;
}

/**
 * Delete a conversation and its messages.
 */
export async function deleteConversation(db: any, conversationId: string): Promise<void> {
  // Batch delete: messages first, then conversation
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, conversationId)),
    db.delete(conversations).where(eq(conversations.id, conversationId)),
  ]);
}

// ---------------------------------------------------------------------------
// Webhook Helpers
// ---------------------------------------------------------------------------

/**
 * Trigger webhooks for conversation.created event.
 * Fire-and-forget: does not block the response.
 */
async function triggerConversationCreatedWebhook(
  db: any,
  executionCtx: any,
  projectId: string,
  conversationId: string,
  externalId: string | null,
  title: string | null,
  messageCount: number,
  tokenCount: number,
  timestamp: number,
): Promise<void> {
  // Fetch active webhooks that listen to conversation.created events
  const webhookRows = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      secret: webhooks.secret,
    })
    .from(webhooks)
    .where(
      and(
        eq(webhooks.projectId, projectId),
        eq(webhooks.active, true),
        sql`json_extract(${webhooks.events}, '$') LIKE '%conversation.created%'`,
      ),
    );

  if (webhookRows.length === 0) return;

  const webhookPayload = JSON.stringify({
    event: "conversation.created",
    timestamp,
    data: {
      conversation_id: conversationId,
      project_id: projectId,
      external_id: externalId,
      title,
      message_count: messageCount,
      token_count: tokenCount,
      created_at: timestamp,
    },
  });

  // Fire-and-forget webhook delivery — don't await
  executionCtx.waitUntil(
    (async () => {
      for (const webhook of webhookRows) {
        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "AgentState-Webhooks/1.0",
            },
            body: webhookPayload,
            signal: AbortSignal.timeout(10000), // 10s timeout
          });

          if (response.ok) {
            console.info(
              `[webhook] delivered conversation.created to ${webhook.url} (${response.status})`,
            );
            // Update last_triggered_at
            await db
              .update(webhooks)
              .set({ lastTriggeredAt: timestamp })
              .where(eq(webhooks.id, webhook.id));
          } else {
            console.warn(`[webhook] failed to deliver to ${webhook.url} (${response.status})`);
          }
        } catch (err) {
          console.error(
            `[webhook] error delivering to ${webhook.url}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    })(),
  );
}
