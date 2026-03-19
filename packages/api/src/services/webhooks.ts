// ---------------------------------------------------------------------------
// Webhooks service — Business logic for webhook management
// ---------------------------------------------------------------------------

import { and, eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { webhooks } from "../db/schema";
import { generateId } from "../lib/id";
import { generateWebhookSecret } from "../lib/webhook";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookListItem {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: number;
  last_triggered_at: number | null;
}

export interface WebhookWithSecret extends WebhookListItem {
  secret: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Event Serialization Helpers
// ---------------------------------------------------------------------------

/**
 * Parse events array from JSON string in database.
 */
export function parseEvents(eventsJson: string | null): string[] {
  if (!eventsJson) return [];
  try {
    const parsed = JSON.parse(eventsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize events array to JSON string for database.
 */
export function serializeEvents(events: string[]): string {
  return JSON.stringify(events);
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new webhook for a project.
 * Returns the webhook with the secret (only shown on creation).
 */
export async function createWebhook(
  db: DrizzleD1Database,
  projectId: string,
  input: CreateWebhookInput,
): Promise<WebhookWithSecret> {
  const { url, events } = input;
  const now = Date.now();
  const webhookId = generateId();
  const secret = await generateWebhookSecret();

  await db.insert(webhooks).values({
    id: webhookId,
    projectId,
    url,
    events: serializeEvents(events),
    secret,
    active: true,
    createdAt: now,
    lastTriggeredAt: null,
  });

  return {
    id: webhookId,
    project_id: projectId,
    url,
    events,
    active: true,
    secret,
    created_at: now,
    last_triggered_at: null,
  };
}

/**
 * List webhooks for a project.
 * Secrets are never included in list responses.
 */
export async function listWebhooks(
  db: DrizzleD1Database,
  projectId: string,
): Promise<WebhookListItem[]> {
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.projectId, projectId))
    .orderBy(webhooks.createdAt);

  return rows.map((w) => toWebhookListItem(w));
}

/**
 * Get a webhook by ID and project.
 * Returns null if not found. Secret is never included.
 */
export async function getWebhookById(
  db: DrizzleD1Database,
  projectId: string,
  webhookId: string,
): Promise<WebhookListItem | null> {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.projectId, projectId)))
    .limit(1);

  if (!webhook) {
    return null;
  }

  return toWebhookListItem(webhook);
}

/**
 * Update a webhook by ID and project.
 * Returns null if webhook not found.
 */
export async function updateWebhook(
  db: DrizzleD1Database,
  projectId: string,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookListItem | null> {
  // Verify webhook exists and belongs to project
  const existing = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.projectId, projectId)))
    .get();

  if (!existing) {
    return null;
  }

  const { url, events, active } = input;
  const updates: Partial<{
    url: string;
    events: string;
    active: boolean;
  }> = {};

  if (url !== undefined) updates.url = url;
  if (events !== undefined) updates.events = serializeEvents(events);
  if (active !== undefined) updates.active = active;

  await db.update(webhooks).set(updates).where(eq(webhooks.id, webhookId));

  // Build response from updated values
  return {
    id: webhookId,
    project_id: projectId,
    url: url ?? existing.url,
    events: events !== undefined ? events : parseEvents(existing.events),
    active: active !== undefined ? active : existing.active === true,
    created_at: existing.createdAt,
    last_triggered_at: existing.lastTriggeredAt ?? null,
  };
}

/**
 * Delete a webhook by ID and project.
 * Returns true if deleted, false if not found.
 */
export async function deleteWebhook(
  db: DrizzleD1Database,
  projectId: string,
  webhookId: string,
): Promise<boolean> {
  // Verify webhook exists and belongs to project
  const existing = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.projectId, projectId)))
    .get();

  if (!existing) {
    return false;
  }

  await db.delete(webhooks).where(eq(webhooks.id, webhookId));
  return true;
}

/**
 * Fetch active webhooks for a project that listen to a specific event.
 * Returns webhook configs for delivery (includes secret).
 */
export async function getActiveWebhooksForEvent(
  db: DrizzleD1Database,
  projectId: string,
  event: string,
): Promise<Array<{ id: string; url: string; secret: string }>> {
  // Use sql.raw to avoid parameter binding issues with the LIKE pattern
  const rows = await db
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
        sql.raw(`json_extract(${webhooks.events.name}, '$') LIKE '%${event}%'`),
      ),
    );

  return rows;
}

/**
 * Update the last triggered timestamp for a webhook.
 * Used after successful webhook delivery.
 */
export async function updateWebhookLastTriggered(
  db: DrizzleD1Database,
  webhookId: string,
  timestamp: number,
): Promise<void> {
  await db.update(webhooks).set({ lastTriggeredAt: timestamp }).where(eq(webhooks.id, webhookId));
}

// ---------------------------------------------------------------------------
// Response Helpers
// ---------------------------------------------------------------------------

/**
 * Convert database row to API response format (without secret).
 */
function toWebhookListItem(row: typeof webhooks.$inferSelect): WebhookListItem {
  return {
    id: row.id,
    project_id: row.projectId,
    url: row.url,
    events: parseEvents(row.events),
    active: row.active === true,
    created_at: row.createdAt,
    last_triggered_at: row.lastTriggeredAt ?? null,
  };
}
