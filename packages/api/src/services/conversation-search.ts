import { and, desc, eq, like, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { conversations, messages } from "../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of results to return per page. */
const MAX_LIMIT = 100;

/** Default limit when not specified. */
const DEFAULT_LIMIT = 20;

/** Number of characters to show before the match in snippets. */
const SNIPPET_PREFIX_CHARS = 40;

/** Maximum length of search snippets. */
const SNIPPET_MAX_LEN = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchParams {
  /** Search query string. */
  query: string;
  /** Maximum number of results to return (1-100). */
  limit: number;
  /** Cursor for pagination (Unix timestamp in milliseconds). */
  cursor?: string;
}

export interface SearchResult {
  id: string;
  title: string | null;
  snippet: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

export interface SearchResponse {
  data: SearchResult[];
  next_cursor: string | null;
}

export interface SearchRow {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  matchingMessageId: string;
  matchingContent: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate and parse search query parameter.
 * @throws {Error} if query is missing or empty
 */
export function validateQuery(raw: string | undefined): string {
  if (!raw || raw.trim() === "") {
    throw new Error("Query parameter 'q' is required and must not be empty");
  }
  return raw.trim();
}

/**
 * Validate and parse limit parameter.
 * Ensures limit is between 1 and MAX_LIMIT.
 */
export function validateLimit(raw: string | undefined): number {
  const parsed = parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * Validate cursor parameter if provided.
 * @throws {Error} if cursor is not a valid Unix timestamp
 */
export function validateCursor(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const cursorNum = Number(raw);
  if (
    Number.isNaN(cursorNum) ||
    !Number.isFinite(cursorNum) ||
    cursorNum < 0 ||
    cursorNum > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("Cursor must be a valid positive number (Unix timestamp in milliseconds)");
  }

  return raw;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Escape SQL LIKE wildcard characters to prevent injection.
 * Must escape backslash first, then the special characters.
 *
 * @param input - User input to escape
 * @returns Escaped string safe for use in LIKE patterns
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[");
}

/**
 * Build a search snippet from message content with the query highlighted.
 * Returns up to SNIPPET_MAX_LEN characters with context around the match.
 *
 * @param content - Full message content
 * @param query - Search query (case-insensitive)
 * @returns Snippet with ellipsis where truncated
 */
export function buildSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());

  // No exact match (can happen with LIKE wildcards); return the start of content
  if (idx === -1) {
    return content.slice(0, SNIPPET_MAX_LEN);
  }

  const start = Math.max(0, idx - SNIPPET_PREFIX_CHARS);
  const end = Math.min(content.length, start + SNIPPET_MAX_LEN);
  const snippet = content.slice(start, end);

  return (start > 0 ? "…" : "") + snippet + (end < content.length ? "…" : "");
}

// ---------------------------------------------------------------------------
// Query Functions
// ---------------------------------------------------------------------------

/**
 * Build WHERE conditions for the search query.
 * Combines project filter, search pattern, and optional cursor.
 */
export function buildSearchConditions(
  projectId: string,
  escapedQuery: string,
  cursorTs: number | undefined,
): ReturnType<typeof and>[] {
  const conditions: ReturnType<typeof and>[] = [
    eq(conversations.projectId, projectId),
    like(messages.content, `%${escapedQuery}%`),
  ];

  if (cursorTs !== undefined) {
    conditions.push(lt(conversations.updatedAt, cursorTs));
  }

  return conditions;
}

/**
 * Execute the search query against the database.
 * Joins conversations with messages to find matching content.
 */
export async function executeSearch(
  db: DrizzleD1Database,
  projectId: string,
  escapedQuery: string,
  limit: number,
  cursorTs: number | undefined,
): Promise<SearchRow[]> {
  const conditions = buildSearchConditions(projectId, escapedQuery, cursorTs);

  return (
    db
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
      .limit(limit + 1)
  );
}

// ---------------------------------------------------------------------------
// Result Builders
// ---------------------------------------------------------------------------

/**
 * Build paginated search response from query results.
 * Handles cursor pagination and snippet generation.
 */
export function buildSearchResult(
  rows: SearchRow[],
  limit: number,
  escapedQuery: string,
): SearchResponse {
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

  return { data, next_cursor: nextCursor };
}

// ---------------------------------------------------------------------------
// Main Service Function
// ---------------------------------------------------------------------------

/**
 * Search conversations by message content with pagination.
 *
 * This is the main entry point for the search service. It validates input,
 * executes the search query, and returns formatted results.
 *
 * @param db - Database instance
 * @param projectId - Project ID to search within
 * @param params - Search parameters (query, limit, cursor)
 * @returns Search response with results and pagination info
 * @throws {Error} if validation fails
 */
export async function searchConversations(
  db: DrizzleD1Database,
  projectId: string,
  params: SearchParams,
): Promise<SearchResponse> {
  // Validate and parse parameters
  const query = validateQuery(params.query);
  const limit = validateLimit(String(params.limit));
  const cursor = validateCursor(params.cursor);

  // Escape query for safe LIKE pattern matching
  const escapedQuery = escapeLikePattern(query);

  // Parse cursor timestamp
  const cursorTs = cursor !== undefined ? parseInt(cursor, 10) : undefined;

  // Execute search
  const rows = await executeSearch(db, projectId, escapedQuery, limit, cursorTs);

  // Build response
  return buildSearchResult(rows, limit, escapedQuery);
}
