import { isSafeWebhookUrl } from "./url-safety";
import { WEBHOOK_EVENT_TYPES } from "./validation";

/**
 * Valid webhook event types.
 */
export const WEBHOOK_EVENTS = WEBHOOK_EVENT_TYPES;
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
 * Recommended tolerance window (ms) for receivers validating the
 * X-AgentState-Timestamp header against their own clock. See docs/webhooks.md.
 */
export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Generate HMAC SHA-256 signature. Callers sign `${timestamp}.${body}` (see
 * sendWebhookWithRetry) so the signature is bound to a delivery time and
 * cannot be replayed outside the receiver's tolerance window.
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
  // Re-check the URL immediately before delivery (defense in depth): the stored
  // URL passed validation at registration, but re-validating here guards against
  // stale rows written before the SSRF guard existed and keeps delivery from
  // ever hitting a private/loopback/metadata host or a non-https scheme.
  if (!isSafeWebhookUrl(url)) {
    return {
      webhookId: "",
      url,
      success: false,
      error: "Webhook URL blocked: must be https and not a private/loopback/metadata host",
      attempts: 0,
    };
  }

  // Sign "timestamp.body" rather than the body alone so a captured delivery
  // can't be replayed indefinitely — receivers reject deliveries whose
  // timestamp is outside their tolerance window (see WEBHOOK_TIMESTAMP_TOLERANCE_MS).
  const timestamp = Date.now();
  const signature = await signWebhookPayload(secret, `${timestamp}.${payload}`);
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AgentState-Signature": signature,
          "X-AgentState-Timestamp": String(timestamp),
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
