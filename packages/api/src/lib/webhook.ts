import type { SQL } from "drizzle-orm";

/**
 * Valid webhook event types.
 */
export const WEBHOOK_EVENTS = ["conversation.created"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Webhook delivery result with attempt details.
 */
export interface WebhookDeliveryResult {
  webhookId: string;
  url: string;
  success: boolean;
  status?: number;
  error?: string;
  attempts: number;
}

/**
 * Generate a cryptographically secure webhook secret.
 * Returns a 64-character hex string (32 bytes).
 */
export async function generateWebhookSecret(): Promise<string> {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return Array.from(secret)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate HMAC SHA-256 signature for webhook payload verification.
 */
export async function signWebhookPayload(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Send webhook with exponential backoff retry logic.
 * Max 3 attempts with delays: 1s, 2s, 4s.
 *
 * Returns delivery result with attempt details.
 */
export async function sendWebhookWithRetry(
  url: string,
  secret: string,
  payload: string,
): Promise<WebhookDeliveryResult> {
  const signature = await signWebhookPayload(secret, payload);
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AgentState-Signature": signature,
          "User-Agent": "AgentState-Webhooks/1.0",
        },
        body: payload,
        signal: AbortSignal.timeout(10000), // 10s timeout per attempt
      });

      if (response.ok) {
        return {
          webhookId: "",
          url,
          success: true,
          status: response.status,
          attempts: attempt + 1,
        };
      }

      // Non-OK response — log and retry if attempts remain
      const lastAttempt = attempt === maxAttempts - 1;
      if (lastAttempt) {
        return {
          webhookId: "",
          url,
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          attempts: attempt + 1,
        };
      }
    } catch (err) {
      // Network error or timeout — log and retry
      const lastAttempt = attempt === maxAttempts - 1;
      if (lastAttempt) {
        return {
          webhookId: "",
          url,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          attempts: attempt + 1,
        };
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    webhookId: "",
    url,
    success: false,
    error: "Max retries exceeded",
    attempts: maxAttempts,
  };
}

/**
 * Fire-and-forget webhook delivery for multiple webhooks.
 * Updates last_triggered_at after delivery attempts.
 *
 * This function spawns delivery in the background and returns immediately.
 */
export function deliverWebhooks(
  webhooks: Array<{ id: string; url: string; secret: string }>,
  payload: string,
  db: { batch: (items: SQL[]) => Promise<void> },
): void {
  // Fire-and-forget — don't await the delivery
  (async () => {
    const results: WebhookDeliveryResult[] = [];

    for (const webhook of webhooks) {
      const result = await sendWebhookWithRetry(webhook.url, webhook.secret, payload);
      result.webhookId = webhook.id;
      results.push(result);

      // Log webhook delivery (could be sent to a logging service)
      console.info(
        `[webhook] id=${webhook.id} url=${webhook.url} success=${result.success} attempts=${result.attempts} status=${result.status ?? "N/A"}`,
      );
    }

    // Update last_triggered_at for all webhooks regardless of success/failure
    const now = Date.now();
    const updateOps = results.map(
      (r) => sql`UPDATE webhooks SET last_triggered_at = ${now} WHERE id = ${r.webhookId}`,
    );

    // Fire-and-forget the batch update
    try {
      await db.batch(updateOps);
    } catch (err) {
      console.error(`[webhook] failed to update last_triggered_at: ${err}`);
    }
  })().catch((err) => {
    console.error(`[webhook] delivery error: ${err}`);
  });
}

// Import at bottom to avoid circular dependency
import { sql } from "drizzle-orm";
