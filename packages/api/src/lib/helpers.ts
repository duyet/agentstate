import type { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { conversations } from "../db/schema";
import type { Bindings, Variables } from "../types";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Parse JSON body from request, returning null on failure.
 */
export async function parseBody<T = unknown>(c: AppContext): Promise<T | null> {
  return c.req.json<T>().catch(() => null);
}

/**
 * Load a conversation that belongs to the authenticated project.
 * Returns the conversation row or null if not found / wrong project.
 */
export async function loadConversation(c: AppContext, id: string) {
  const db = c.get("db");
  const projectId = c.get("projectId");

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.projectId, projectId)))
    .limit(1);

  return conv ?? null;
}

/**
 * Return a standard 400 error for invalid JSON body.
 */
export function badRequest(c: AppContext, message = "Invalid JSON body") {
  return c.json({ error: { code: "BAD_REQUEST", message } }, 400);
}

/**
 * Return a standard 404 error.
 */
export function notFound(c: AppContext, message = "Conversation not found") {
  return c.json({ error: { code: "NOT_FOUND", message } }, 404);
}
