import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Single source of truth for message roles */
export const MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

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
 * Valid tag format: alphanumeric, hyphens, underscores only.
 * Prevents SQL injection by excluding special characters like quotes,
 * semicolons, wildcards, and other SQL metacharacters.
 */
export const TagSchema = z
  .string()
  .min(1, "tag cannot be empty")
  .max(50, "tag cannot exceed 50 characters")
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
    .regex(SLUG_PATTERN, "slug must be lowercase alphanumeric with hyphens"),
  org_id: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ---------------------------------------------------------------------------
// Webhook schemas
// ---------------------------------------------------------------------------

/** Valid webhook event types */
export const WEBHOOK_EVENT_TYPES = ["conversation.created"] as const;
export const WebhookEventSchema = z.enum(WEBHOOK_EVENT_TYPES);

export const CreateWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(WebhookEventSchema).min(1, "At least one event is required").max(10),
});
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL").optional(),
  events: z.array(WebhookEventSchema).min(1).max(10).optional(),
  active: z.boolean().optional(),
});
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
