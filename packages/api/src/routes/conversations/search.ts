import { and, asc, desc, eq, like, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../db/schema";
import { notFound } from "../../lib/helpers";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import type { Bindings, Variables } from "../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// GET /search — Search conversations by message content
// ---------------------------------------------------------------------------

// Snippet extraction: return up to `maxLen` characters of the matching portion
// of the message content, with a short prefix for context.
const SNIPPET_PREFIX_CHARS = 40;
const SNIPPET_MAX_LEN = 200;

/**
 * Escape SQL LIKE wildcard characters to prevent injection.
 * Must escape backslash first, then the special characters.
 */
function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[");
}

function buildSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    // No exact match (can happen with LIKE wildcards); return the start of content.
    return content.slice(0, SNIPPET_MAX_LEN);
  }
  const start = Math.max(0, idx - SNIPPET_PREFIX_CHARS);
  const end = Math.min(content.length, start + SNIPPET_MAX_LEN);
  const snippet = content.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < content.length ? "…" : "");
}

router.get("/search", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const q = c.req.query("q");
  if (!q || q.trim() === "") {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'q' is required and must not be empty",
        },
      },
      400,
    );
  }
  const query = q.trim();
  const escapedQuery = escapeLikePattern(query);

  const limitRaw = parseInt(c.req.query("limit") ?? "20", 10);
  const limit = Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? 20 : limitRaw, 100);

  const cursor = c.req.query("cursor");

  // Build the cursor condition. Cursor is the `updated_at` timestamp of the last
  // result from the previous page, so we page forward with `updated_at < cursor`
  // (newest-first ordering, matching the list endpoint convention).
  const conditions = [
    eq(conversations.projectId, projectId),
    like(messages.content, `%${escapedQuery}%`),
  ];

  if (cursor) {
    const cursorTs = parseInt(cursor, 10);
    if (!Number.isNaN(cursorTs)) {
      conditions.push(lt(conversations.updatedAt, cursorTs));
    }
  }

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      messageCount: conversations.messageCount,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      // Pick the earliest matching message for the snippet (MIN gives a
      // deterministic ordering without requiring a subquery).
      matchingMessageId: sql<string>`MIN(${messages.id})`,
      matchingContent: sql<string>`MIN(${messages.content})`,
    })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt))
    // Fetch one extra row to determine if a next page exists.
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

  const nextCursor = hasNextPage ? String(pageRows[pageRows.length - 1].updatedAt) : null;

  const data = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: buildSnippet(row.matchingContent, escapedQuery),
    message_count: row.messageCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }));

  return c.json({ data, next_cursor: nextCursor });
});

// ---------------------------------------------------------------------------
// GET /by-external-id/:externalId — Lookup by caller-provided ID
// ---------------------------------------------------------------------------

router.get("/by-external-id/:externalId", async (c) => {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const externalId = c.req.param("externalId");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.externalId, externalId), eq(conversations.projectId, projectId)))
    .limit(1);

  if (!conversation) return notFound(c);

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt));

  return c.json({
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  });
});

export default router;
