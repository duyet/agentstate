import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { conversations, messages } from "../../../db/schema";
import { generateEmbedding, queryVectors } from "../../../services/embeddings";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// POST / — Semantic search across conversations
// ---------------------------------------------------------------------------

router.post("/", async (c) => {
  const body = await c.req.json<{
    query?: string;
    limit?: number;
    filter?: { project_id?: string; date_from?: number; date_to?: number; tags?: string[] };
  }>();

  if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
    return c.json({ error: { code: "BAD_REQUEST", message: "query is required" } }, 400);
  }

  const index = c.env.VECTORIZE_INDEX;
  if (!index) {
    return c.json(
      { error: { code: "NOT_CONFIGURED", message: "Semantic search is not enabled for this project" } },
      501,
    );
  }

  const projectId = c.get("projectId");
  const limit = Math.min(body.limit ?? 10, 50);

  try {
    // Generate query embedding
    const vector = await generateEmbedding(c.env.AI, body.query);

    // Query Vectorize with project filter
    const results = await queryVectors(index, vector, limit * 3, {
      project_id: projectId,
    });

    if (results.length === 0) {
      return c.json({ results: [], query: body.query, total: 0 });
    }

    // Fetch matching messages from DB for full content
    const messageIds = results.map((r) => String(r.metadata.message_id));
    const matchingMessages = await c
      .get("db")
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.id, messageIds));

    // Build a lookup for fast access
    const messageLookup = new Map(matchingMessages.map((m) => [m.id, m]));

    // Fetch conversation titles for context
    const convIds = [...new Set(results.map((r) => String(r.metadata.conversation_id)))];
    const convRows = await c
      .get("db")
      .select({ id: conversations.id, title: conversations.title })
      .from(conversations)
      .where(inArray(conversations.id, convIds));
    const titleLookup = new Map(convRows.map((c) => [c.id, c.title]));

    // Merge vector results with DB data, deduplicate by message
    const seen = new Set<string>();
    const searchResults = results
      .filter((r) => {
        if (seen.has(r.metadata.message_id)) return false;
        seen.add(r.metadata.message_id);
        return messageLookup.has(r.metadata.message_id);
      })
      .slice(0, limit)
      .map((r) => {
        const msg = messageLookup.get(r.metadata.message_id)!;
        return {
          conversation_id: r.metadata.conversation_id,
          message_id: r.metadata.message_id,
          role: msg.role,
          content: msg.content,
          score: r.score,
          title: titleLookup.get(r.metadata.conversation_id) ?? null,
          created_at: msg.createdAt,
        };
      });

    return c.json({
      results: searchResults,
      query: body.query,
      total: searchResults.length,
    });
  } catch (err) {
    console.error("[search] semantic search failed:", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Semantic search failed" } },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /context — Context retrieval for LLM injection
// ---------------------------------------------------------------------------

router.post("/context", async (c) => {
  const body = await c.req.json<{
    query?: string;
    max_tokens?: number;
    project_id?: string;
  }>();

  if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
    return c.json({ error: { code: "BAD_REQUEST", message: "query is required" } }, 400);
  }

  const index = c.env.VECTORIZE_INDEX;
  if (!index) {
    return c.json(
      { error: { code: "NOT_CONFIGURED", message: "Semantic search is not enabled for this project" } },
      501,
    );
  }

  const projectId = c.get("projectId");
  const maxTokens = Math.min(body.max_tokens ?? 4000, 32000);

  try {
    // Generate query embedding
    const vector = await generateEmbedding(c.env.AI, body.query);

    // Query with high topK to get enough candidates
    const results = await queryVectors(index, vector, 50, { project_id: projectId });

    if (results.length === 0) {
      return c.json({ messages: [], total_tokens: 0, query: body.query });
    }

    // Fetch full message content from DB
    const messageIds = results.map((r) => String(r.metadata.message_id));
    const matchingMessages = await c
      .get("db")
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        role: messages.role,
        content: messages.content,
        tokenCount: messages.tokenCount,
      })
      .from(messages)
      .where(inArray(messages.id, messageIds));

    const messageLookup = new Map(matchingMessages.map((m) => [m.id, m]));

    // Pack messages until token budget is exhausted
    let totalTokens = 0;
    const contextMessages: Array<{
      role: string;
      content: string;
      conversation_id: string;
      score: number;
    }> = [];

    const seen = new Set<string>();
    for (const r of results) {
      if (seen.has(r.metadata.message_id)) continue;
      seen.add(r.metadata.message_id);

      const msg = messageLookup.get(r.metadata.message_id);
      if (!msg) continue;

      // Rough token estimate: use stored token_count or fallback to char/4
      const estimatedTokens = msg.tokenCount || Math.ceil(msg.content.length / 4);

      if (totalTokens + estimatedTokens > maxTokens) break;

      totalTokens += estimatedTokens;
      contextMessages.push({
        role: msg.role,
        content: msg.content,
        conversation_id: r.metadata.conversation_id,
        score: r.score,
      });
    }

    return c.json({
      messages: contextMessages,
      total_tokens: totalTokens,
      query: body.query,
    });
  } catch (err) {
    console.error("[search] context retrieval failed:", err);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Context retrieval failed" } },
      500,
    );
  }
});

export default router;
