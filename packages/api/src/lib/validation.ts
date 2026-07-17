import { z } from "zod";
import { GrantableScopeSchema } from "./scopes";
import { isSafeWebhookUrl } from "./url-safety";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Single source of truth for message roles */
export const MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/** Observation types for LLM tracing */
export const OBSERVATION_TYPES = ["generation", "tool", "agent", "chain", "span", "event"] as const;
export type ObservationType = (typeof OBSERVATION_TYPES)[number];

export const OBSERVATION_STATUSES = ["success", "error"] as const;
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

export const OBSERVATION_LEVELS = ["debug", "default", "warning", "error"] as const;
export type ObservationLevel = (typeof OBSERVATION_LEVELS)[number];

/**
 * Valid slug pattern for project slugs.
 * Must be lowercase alphanumeric with hyphens allowed in the middle.
 * Examples: "my-project", "app", "project-123"
 * Invalid: "MyProject", "-project", "project-", "my_project"
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// ---------------------------------------------------------------------------
// Message schemas
// ---------------------------------------------------------------------------

export const MessageInputSchema = z.object({
  role: z.enum(MESSAGE_ROLES),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  token_count: z.number().int().nonnegative().optional(),
  model: z.string().max(100).optional(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  cost_microdollars: z.number().int().nonnegative().optional(),
  parent_message_id: z.string().optional(),
  observation_type: z.enum(OBSERVATION_TYPES).optional(),
  start_time: z.number().int().nonnegative().optional(),
  end_time: z.number().int().nonnegative().optional(),
  status: z.enum(OBSERVATION_STATUSES).optional(),
  level: z.enum(OBSERVATION_LEVELS).optional(),
});
export type MessageInput = z.infer<typeof MessageInputSchema>;

// ---------------------------------------------------------------------------
// Conversation schemas
// ---------------------------------------------------------------------------

export const CreateConversationSchema = z.object({
  external_id: z.string().optional(),
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  messages: z.array(MessageInputSchema).optional(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const UpdateConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;

export const AppendMessagesSchema = z.object({
  messages: z.array(MessageInputSchema).min(1),
});
export type AppendMessagesInput = z.infer<typeof AppendMessagesSchema>;

export const ExportSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
});
export type ExportInput = z.infer<typeof ExportSchema>;

export const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});
export type BulkDeleteInput = z.infer<typeof BulkDeleteSchema>;

// ---------------------------------------------------------------------------
// Tag schemas
// ---------------------------------------------------------------------------

/**
 * Maximum length for tag values across the API (conversation tags and state
 * tags). Both are stored in unbounded `text` columns, so this is purely an
 * application-level guard. Unified to 50 — the original `TagSchema` limit,
 * which is already an enforced product contract (see
 * `test/tags.test.ts`) — narrowing `StateTagInputSchema` from its previous
 * 64 to match, since no caller relies on state tags longer than 50 chars.
 */
export const TAG_MAX_LENGTH = 50;

/**
 * Valid tag format: alphanumeric, hyphens, underscores only.
 * Prevents SQL injection by excluding special characters like quotes,
 * semicolons, wildcards, and other SQL metacharacters.
 */
export const TagSchema = z
  .string()
  .min(1, "tag cannot be empty")
  .max(TAG_MAX_LENGTH, `tag cannot exceed ${TAG_MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9_-]+$/, "tag can only contain letters, numbers, hyphens, and underscores");

export const AddTagsSchema = z.object({
  tags: z.array(TagSchema).min(1).max(50),
});
export type AddTagsInput = z.infer<typeof AddTagsSchema>;

// ---------------------------------------------------------------------------
// API key schemas
// ---------------------------------------------------------------------------

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  /**
   * Optional permission scopes for the new key. Omit for a full-access key
   * (back-compat). When creating via another key (API / MCP), each requested
   * scope must be a subset of the caller's own scopes — enforced in the route.
   */
  scopes: z.array(GrantableScopeSchema).min(1, "at least one scope is required").max(64).optional(),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

// ---------------------------------------------------------------------------
// Project schemas
// ---------------------------------------------------------------------------

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .max(255, "slug cannot exceed 255 characters")
    .regex(SLUG_PATTERN, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z
  .object({
    name: z.string().min(1, "name is required").optional(),
    retention_days: z.number().int().min(1).max(3650).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.retention_days !== undefined, {
    message: "At least one field is required",
  });
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ---------------------------------------------------------------------------
// Webhook schemas
// ---------------------------------------------------------------------------

/** Valid webhook event types */
export const WEBHOOK_EVENT_TYPES = ["conversation.created"] as const;
export const WebhookEventSchema = z.enum(WEBHOOK_EVENT_TYPES);

/**
 * A webhook URL must be https and must not point at a loopback / private /
 * link-local / metadata host (SSRF guard). See lib/url-safety.ts.
 */
const WebhookUrlSchema = z.string().url("Invalid webhook URL").refine(isSafeWebhookUrl, {
  message:
    "Webhook URL must be https and must not target a private, loopback, link-local, or metadata host",
});

export const CreateWebhookSchema = z.object({
  url: WebhookUrlSchema,
  events: z.array(WebhookEventSchema).min(1, "At least one event is required").max(10),
});
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  url: WebhookUrlSchema.optional(),
  events: z.array(WebhookEventSchema).min(1).max(10).optional(),
  active: z.boolean().optional(),
});
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

// ---------------------------------------------------------------------------
// State platform schemas
// ---------------------------------------------------------------------------

export const StateTagInputSchema = z
  .string()
  .min(1, "tag cannot be empty")
  .max(TAG_MAX_LENGTH, `tag cannot exceed ${TAG_MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9_-]+$/, "tag can only contain letters, numbers, hyphens, and underscores");

export const UpsertStateSchema = z.object({
  agent_id: z.string().min(1).max(255),
  data: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(StateTagInputSchema).max(50).optional(),
  lease_id: z.string().min(1).optional(),
});
export type UpsertStateInput = z.infer<typeof UpsertStateSchema>;

export const StateQueryPredicateSchema = z.object({
  path: z.string().min(1),
  equals: z.unknown(),
});

export const QueryStatesSchema = z.object({
  agent_id: z.string().min(1).max(255).optional(),
  tags: z.array(StateTagInputSchema).max(50).optional(),
  updated_after: z.number().int().nonnegative().optional(),
  updated_before: z.number().int().nonnegative().optional(),
  json_path: z.string().min(1).optional(),
  json_equals: z.unknown().optional(),
  predicates: z.array(StateQueryPredicateSchema).max(10).optional(),
  at_sequence: z.number().int().positive().optional(),
  at_time: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});
export type QueryStatesInput = z.infer<typeof QueryStatesSchema>;

export const CreateLeaseSchema = z.object({
  holder: z.string().min(1).max(255),
  ttl_ms: z.number().int().min(1000).max(3_600_000).optional(),
});
export type CreateLeaseInput = z.infer<typeof CreateLeaseSchema>;

export const RenewLeaseSchema = z.object({
  ttl_ms: z.number().int().min(1000).max(3_600_000).optional(),
});
export type RenewLeaseInput = z.infer<typeof RenewLeaseSchema>;

export const CAPABILITY_SCOPES = [
  "state:read",
  "state:write",
  "state:watch",
  "lease:write",
  "claim:write",
] as const;
export const CapabilityScopeSchema = z.enum(CAPABILITY_SCOPES);
export type CapabilityScope = z.infer<typeof CapabilityScopeSchema>;

export const CreateCapabilityTokenSchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(CapabilityScopeSchema).min(1).max(CAPABILITY_SCOPES.length),
  expires_at: z.number().int().positive().optional(),
});
export type CreateCapabilityTokenInput = z.infer<typeof CreateCapabilityTokenSchema>;

export const CLAIM_EVIDENCE_KINDS = ["state_event", "text_hash", "json_value"] as const;
export const ClaimEvidenceKindSchema = z.enum(CLAIM_EVIDENCE_KINDS);

export const ClaimEvidenceInputSchema = z.object({
  kind: ClaimEvidenceKindSchema,
  source: z.string().min(1).max(500),
  data: z.unknown().optional(),
  hash: z.string().min(1).optional(),
  json_path: z.string().min(1).optional(),
  expected_value: z.unknown().optional(),
});

export const CreateClaimSchema = z.object({
  subject_type: z.string().min(1).max(100),
  subject_id: z.string().min(1).max(255),
  statement: z.string().min(1).max(5000),
  evidence: z.array(ClaimEvidenceInputSchema).min(1).max(50),
});
export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

// ---------------------------------------------------------------------------
// Trace ingestion schemas
// ---------------------------------------------------------------------------

const ObservationInputSchema = z.object({
  role: z.enum(MESSAGE_ROLES).optional().default("assistant"),
  content: z.string().min(1),
  parent_message_id: z.string().optional(),
  observation_type: z.enum(OBSERVATION_TYPES),
  metadata: z.record(z.unknown()).optional(),
  model: z.string().max(100).optional(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  token_count: z.number().int().nonnegative().optional(),
  cost_microdollars: z.number().int().nonnegative().optional(),
  start_time: z.number().int().nonnegative().optional(),
  end_time: z.number().int().nonnegative().optional(),
  status: z.enum(OBSERVATION_STATUSES).optional(),
  level: z.enum(OBSERVATION_LEVELS).optional(),
});

export const IngestTraceSchema = z.object({
  trace: z.object({
    external_id: z.string().optional(),
    title: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  observations: z.array(ObservationInputSchema).min(1).max(100),
});
export type IngestTraceInput = z.infer<typeof IngestTraceSchema>;
