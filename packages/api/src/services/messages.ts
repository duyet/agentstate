import { eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Message } from "../db/schema";
import { conversations, messages } from "../db/schema";
import { generateId } from "../lib/id";
import { serializeMetadata } from "../lib/serialization";
import type { MessageInput } from "../lib/validation";

/** D1 permits 100 bound parameters per statement; a message has 17 columns. */
export const MESSAGE_INSERT_CHUNK_SIZE = 5;

/**
 * Build the chunked INSERT statements for a set of message rows, unexecuted.
 *
 * Callers get the statements rather than a completed write so they can fold the
 * inserts into a larger `db.batch([...])` alongside the rest of the write (the
 * conversation counter update, the conversation insert) and get one atomic
 * commit instead of a sequence that can half-apply.
 */
export function messageInsertStatements(
  db: DrizzleD1Database,
  rows: (typeof messages.$inferInsert)[],
) {
  const statements = [];
  for (let index = 0; index < rows.length; index += MESSAGE_INSERT_CHUNK_SIZE) {
    statements.push(
      db.insert(messages).values(rows.slice(index, index + MESSAGE_INSERT_CHUNK_SIZE)),
    );
  }
  return statements;
}

export async function insertMessageRows(
  db: DrizzleD1Database,
  rows: (typeof messages.$inferInsert)[],
): Promise<void> {
  const statements = messageInsertStatements(db, rows);
  if (statements.length === 0) return;
  // D1 batch is transactional, so a failed chunk cannot leave a partial append.
  await db.batch(statements as any);
}

/**
 * Append messages to a conversation.
 *
 * Inserts message records and updates the conversation's message and token
 * counts. Both land in one `db.batch([...])`: the rows and the counters that
 * describe them commit together, so a mid-write failure cannot leave messages
 * that no counter accounts for (silent, cumulative drift — nothing reconciles
 * it later).
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param inputMessages - Messages to append from API request
 * @returns Inserted message records
 */
export async function appendMessages(
  db: DrizzleD1Database,
  conversationId: string,
  inputMessages: MessageInput[],
): Promise<Message[]> {
  const now = Date.now();

  const messageRows = inputMessages.map((m) => ({
    id: generateId(),
    conversationId,
    role: m.role as "system" | "user" | "assistant" | "tool",
    content: m.content,
    metadata: serializeMetadata(m.metadata),
    tokenCount: m.token_count ?? 0,
    model: m.model ?? null,
    inputTokens: m.input_tokens ?? null,
    outputTokens: m.output_tokens ?? null,
    costMicrodollars: m.cost_microdollars ?? null,
    parentMessageId: m.parent_message_id ?? null,
    observationType: m.observation_type ?? null,
    startTime: m.start_time ?? null,
    endTime: m.end_time ?? null,
    status: m.status ?? null,
    level: m.level ?? null,
    createdAt: now,
  }));

  const addedTokens = inputMessages.reduce((sum, m) => sum + (m.token_count ?? 0), 0);
  const addedCost = inputMessages.reduce((sum, m) => sum + (m.cost_microdollars ?? 0), 0);
  const addedInputOutputTokens = inputMessages.reduce(
    (sum, m) => sum + (m.input_tokens ?? 0) + (m.output_tokens ?? 0),
    0,
  );

  await db.batch([
    ...messageInsertStatements(db, messageRows),
    conversationMessageCountUpdate(
      db,
      conversationId,
      inputMessages.length,
      addedTokens,
      addedCost,
      addedInputOutputTokens,
      now,
    ),
  ] as any);

  return messageRows;
}

/**
 * Convert API messages to database message rows.
 *
 * Does NOT insert into the database; only prepares the row objects.
 *
 * @param conversationId - Conversation ID
 * @param inputMessages - Messages to convert from API request
 * @returns Message row objects ready for database insertion
 */
export function serializeMessageRows(conversationId: string, inputMessages: MessageInput[]) {
  const now = Date.now();

  return inputMessages.map((m) => ({
    id: generateId(),
    conversationId,
    role: m.role as "system" | "user" | "assistant" | "tool",
    content: m.content,
    metadata: serializeMetadata(m.metadata),
    tokenCount: m.token_count ?? 0,
    model: m.model ?? null,
    inputTokens: m.input_tokens ?? null,
    outputTokens: m.output_tokens ?? null,
    costMicrodollars: m.cost_microdollars ?? null,
    parentMessageId: m.parent_message_id ?? null,
    observationType: m.observation_type ?? null,
    startTime: m.start_time ?? null,
    endTime: m.end_time ?? null,
    status: m.status ?? null,
    level: m.level ?? null,
    createdAt: now,
  }));
}

/**
 * Build the statement that increments a conversation's message and token
 * counters, unexecuted, so callers can batch it with the writes it accounts
 * for. Uses SQL increment expressions so concurrent appends accumulate instead
 * of overwriting each other.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param addedCount - Number of messages added
 * @param addedTokens - Number of tokens added
 */
export function conversationMessageCountUpdate(
  db: DrizzleD1Database,
  conversationId: string,
  addedCount: number,
  addedTokens: number,
  addedCost = 0,
  addedTotalTokens = 0,
  updatedAt = Date.now(),
) {
  return db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + ${addedCount}`,
      tokenCount: sql`${conversations.tokenCount} + ${addedTokens}`,
      totalCostMicrodollars: sql`${conversations.totalCostMicrodollars} + ${addedCost}`,
      totalTokens: sql`${conversations.totalTokens} + ${addedTotalTokens}`,
      updatedAt,
    })
    .where(eq(conversations.id, conversationId));
}

/**
 * Update a conversation's message and token counts.
 *
 * Executes the update on its own; prefer batching
 * {@link conversationMessageCountUpdate} with the writes it accounts for.
 *
 * @param db - Database instance
 * @param conversationId - Conversation ID
 * @param addedCount - Number of messages added
 * @param addedTokens - Number of tokens added
 */
export async function updateConversationMessageCount(
  db: DrizzleD1Database,
  conversationId: string,
  addedCount: number,
  addedTokens: number,
  addedCost = 0,
  addedTotalTokens = 0,
): Promise<void> {
  await conversationMessageCountUpdate(
    db,
    conversationId,
    addedCount,
    addedTokens,
    addedCost,
    addedTotalTokens,
  );
}
