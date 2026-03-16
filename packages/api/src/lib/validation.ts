import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Single source of truth for message roles */
export const MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

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

export const AddTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(64)).min(1).max(50),
});
export type AddTagsInput = z.infer<typeof AddTagsSchema>;

// ---------------------------------------------------------------------------
// API key schemas
// ---------------------------------------------------------------------------

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "name is required").max(255),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
