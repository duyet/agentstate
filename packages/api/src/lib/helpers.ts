import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { z } from "zod";
import { conversations } from "../db/schema";
import type { Bindings, Variables } from "../types";

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

/**
 * Parse and validate a limit query parameter with configurable bounds.
 *
 * @param raw - The raw string value from query parameter (undefined if not provided)
 * @param defaultLimit - The default limit to use if parameter is missing or invalid (default: 50)
 * @param maxLimit - The maximum allowed limit (default: 100)
 * @returns A validated limit between 1 and maxLimit, or defaultLimit if invalid
 *
 * @example
 * ```ts
 * const limit = parseLimitParam(c.req.query("limit")); // defaults to 50, max 100
 * const limit = parseLimitParam(c.req.query("limit"), 20, 200); // custom defaults
 * ```
 */
export function parseLimitParam(
  raw: string | undefined,
  defaultLimit: number = 50,
  maxLimit: number = 100,
): number {
  const limitRaw = parseInt(raw ?? String(defaultLimit), 10);
  return Math.min(Number.isNaN(limitRaw) || limitRaw < 1 ? defaultLimit : limitRaw, maxLimit);
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
 * Parse JSON body from request, returning null on invalid JSON.
 */
export async function parseJsonBody(c: AppContext) {
  const body = await c.req.json().catch(() => null);
  if (body === null) {
    return { body: null, error: badRequest(c) } as const;
  }
  return { body, error: null } as const;
}

/**
 * Return a standard 400 error for Zod validation failures.
 */
export function validationError(c: AppContext, zodError: z.ZodError) {
  return c.json(
    { error: { code: "BAD_REQUEST", message: zodError.issues[0]?.message ?? "Validation error" } },
    400,
  );
}

/**
 * Return a standard 404 error.
 */
export function notFound(c: AppContext, message = "Conversation not found") {
  return c.json({ error: { code: "NOT_FOUND", message } }, 404);
}

/**
 * Return a generic error response with custom code, message, and status.
 */
export function errorResponse(
  c: AppContext,
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 = 500,
) {
  return c.json({ error: { code, message } }, status);
}

/**
 * Verify the requested project ID matches the authenticated project ID.
 * Returns a 403 response if they don't match, or null if authorized.
 */
export function requireSameProject(c: AppContext, projectId: string) {
  const authedProjectId = c.get("projectId");
  if (projectId !== authedProjectId) {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Cannot manage keys for another project" } },
      403,
    );
  }
  return null;
}
