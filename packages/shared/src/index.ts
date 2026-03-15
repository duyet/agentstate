// API response types

export interface ConversationResponse {
  id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  created_at: number;
}

export interface ConversationWithMessages extends ConversationResponse {
  messages: MessageResponse[];
}

// API request types

export interface CreateConversationRequest {
  external_id?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  messages?: CreateMessageInput[];
}

export interface UpdateConversationRequest {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMessageInput {
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  token_count?: number;
}

export interface AppendMessagesRequest {
  messages: CreateMessageInput[];
}

// API response wrappers

export interface ListResponse<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Project & API key types (dashboard)

export interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  created_at: number;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string; // full key, only shown once at creation
}
