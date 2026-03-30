// API response types

export interface ConversationResponse {
  id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  message_count: number;
  token_count: number;
  total_cost_microdollars: number;
  total_tokens: number;
  created_at: number;
  updated_at: number;
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_microdollars: number | null;
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
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_microdollars?: number;
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
  retention_days: number | null;
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

// Project list item (GET /v1/projects)

export interface ProjectListItem extends ProjectResponse {
  org_id: string;
  key_count: number;
}

// Project detail (GET /v1/projects/:id, GET /v1/projects/by-slug/:slug)

export interface ProjectDetailResponse extends ProjectResponse {
  org_id: string;
  api_keys: ApiKeyResponse[];
}

// Project conversation (GET /v1/projects/:id/conversations)

export interface ProjectConversationResponse extends ConversationResponse {
  project_id: string;
}

// Analytics types (GET /v1/projects/:id/analytics)

export interface AnalyticsSummary {
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  total_cost_microdollars: number;
  active_api_keys: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface TokenTimeSeriesPoint {
  date: string;
  total: number;
}

export interface RecentConversation {
  id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  updated_at: number;
}

export interface CostTimeSeriesPoint {
  date: string;
  total_cost_microdollars: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  conversations_per_day: TimeSeriesPoint[];
  messages_per_day: TimeSeriesPoint[];
  tokens_per_day: TokenTimeSeriesPoint[];
  cost_per_day: CostTimeSeriesPoint[];
  recent_conversations: RecentConversation[];
}

// Search types (GET /v1/conversations/search)

export interface ConversationSearchResult {
  id: string;
  title: string | null;
  snippet: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}

// Tag types (GET /v1/tags, GET/POST /v1/conversations/:id/tags)

export interface TagListResponse {
  tags: string[];
}

// Public analytics types (GET /v1/analytics/*)

export interface AnalyticsPeriod {
  start: number;
  end: number;
}

export interface PublicAnalyticsSummary {
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  total_cost_microdollars: number;
  avg_messages_per_conversation: number;
  avg_tokens_per_conversation: number;
  period: AnalyticsPeriod;
}

export interface PublicTimeseriesPoint {
  bucket: string;
  value: number;
}

export interface PublicTimeseriesResponse {
  metric: string;
  granularity: string;
  period: AnalyticsPeriod;
  data: PublicTimeseriesPoint[];
}

export interface TagBreakdownItem {
  tag: string;
  conversation_count: number;
  message_count: number;
  token_count: number;
}

export interface TagBreakdownResponse {
  period: AnalyticsPeriod;
  data: TagBreakdownItem[];
}

export interface RoleBreakdown {
  count: number;
  tokens: number;
}

export interface ConversationAnalyticsResponse {
  conversation_id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  tags: string[];
  duration_ms: number;
  messages_by_role: Record<string, RoleBreakdown>;
  created_at: number;
  updated_at: number;
}

// Organization types

export interface OrganizationResponse {
  id: string;
  org_id: string;
  name: string;
  created_at: number;
  updated_at: number | null;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  created_at: number;
  updated_at: number;
}

export interface OrganizationInvitation {
  id: string;
  org_id: string;
  email_address: string;
  role: string;
  status: "pending" | "accepted" | "revoked";
  created_at: number;
  updated_at: number;
}

// Custom domain types

export type CustomDomainVerificationStatus = "pending" | "verified" | "failed";

export interface CustomDomainResponse {
  id: string;
  project_id: string;
  domain: string;
  verification_token: string;
  verification_status: CustomDomainVerificationStatus;
  verified_at: number | null;
  ssl_enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreateCustomDomainRequest {
  domain: string;
}

export interface CreateCustomDomainResponse extends CustomDomainResponse {
  verification_instructions: {
    dns_txt: {
      name: string;
      value: string;
    };
    http_file: {
      url: string;
      content: string;
    };
    meta_tag: {
      name: string;
      content: string;
    };
  };
}

// Semantic search types (POST /v2/conversations/search)

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  filter?: {
    project_id?: string;
    date_from?: number;
    date_to?: number;
    tags?: string[];
  };
}

export interface SemanticSearchResult {
  conversation_id: string;
  message_id: string;
  role: string;
  content: string;
  score: number;
  title: string | null;
  created_at: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  query: string;
  total: number;
}

// Context retrieval types (POST /v2/conversations/context)

export interface ContextRetrievalRequest {
  query: string;
  max_tokens?: number;
  project_id: string;
}

export interface ContextMessage {
  role: string;
  content: string;
  conversation_id: string;
  score: number;
}

export interface ContextRetrievalResponse {
  messages: ContextMessage[];
  total_tokens: number;
  query: string;
}
