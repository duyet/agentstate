export interface AgentStateConfig {
  apiKey: string;
  baseUrl?: string; // defaults to "https://agentstate.app/api"
  /** Max retry attempts for transient errors (429, 5xx, network). Default: 3 */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  retryDelayMs?: number;
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
  token_count?: number;
  created_at?: number;
}

export interface Conversation {
  id: string;
  project_id: string;
  external_id: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ListResponse<T> {
  data: T[];
  pagination: { limit: number; next_cursor: string | null };
}

export type StateOrder = "asc" | "desc";
export type StateEventType = "upsert" | "delete";
export type CapabilityTokenScope =
  | "state:read"
  | "state:write"
  | "state:watch"
  | "lease:write"
  | "claim:write";
export type ClaimStatus = "pending" | "verified" | "failed";
export type ClaimEvidenceKind = "state_event" | "text_hash" | "json_value";

export interface StateListResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    next_cursor: string | null;
    total?: number;
  };
}

export interface StateRecord {
  state_key: string;
  agent_id: string;
  data: JsonObject;
  metadata: JsonObject | null;
  tags: string[];
  latest_sequence: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface UpsertStateRequest {
  agent_id: string;
  data: JsonObject;
  metadata?: JsonObject;
  tags?: string[];
  lease_id?: string;
}

export interface StateQueryPredicate {
  path: string;
  equals: JsonValue;
}

export interface StateQueryRequest {
  agent_id?: string;
  tags?: string[];
  updated_after?: number;
  updated_before?: number;
  json_path?: string;
  json_equals?: JsonValue;
  predicates?: StateQueryPredicate[];
  at_sequence?: number;
  at_time?: number;
  limit?: number;
  cursor?: string;
}

export interface StateEvent {
  sequence: number;
  id: string;
  state_key: string;
  agent_id: string;
  event_type: StateEventType;
  data: JsonObject | null;
  metadata: JsonObject | null;
  tags: string[];
  idempotency_key: string | null;
  created_at: number;
}

export interface ListStateEventsParams {
  after?: number;
  limit?: number;
}

export interface DeleteStateRequest {
  lease_id?: string;
}

export interface StateMutationResponse {
  state?: StateRecord;
  deleted?: true;
  event: StateEvent;
}

export interface CreateStateLeaseRequest {
  holder: string;
  ttl_ms?: number;
}

export interface RenewStateLeaseRequest {
  ttl_ms?: number;
}

export interface StateLease {
  id: string;
  project_id: string;
  state_key: string;
  holder: string | null;
  capability_token_id: string | null;
  expires_at: number;
  created_at: number;
  renewed_at: number | null;
  released_at: number | null;
}

export interface CreateCapabilityTokenRequest {
  name: string;
  scopes: CapabilityTokenScope[];
  expires_at?: number;
}

export interface CapabilityToken {
  id: string;
  project_id: string;
  name: string | null;
  state_key: string | null;
  token_prefix: string;
  scopes: CapabilityTokenScope[];
  expires_at: number | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface CapabilityTokenCreated extends CapabilityToken {
  token: string;
}

export interface CapabilityTokenListResponse {
  data: CapabilityToken[];
}

export interface TextHashClaimEvidenceInput {
  kind: "text_hash";
  source: string;
  data: string;
  hash: string;
}

export interface JsonValueClaimEvidenceInput {
  kind: "json_value";
  source: string;
  data: JsonValue;
  json_path: string;
  expected_value: JsonValue;
}

export interface StateEventClaimEvidenceInput {
  kind: "state_event";
  source: string;
  hash?: string;
  json_path?: string;
  expected_value?: JsonValue;
}

export type ClaimEvidenceInput =
  | TextHashClaimEvidenceInput
  | JsonValueClaimEvidenceInput
  | StateEventClaimEvidenceInput;

export interface CreateClaimRequest {
  subject_type: string;
  subject_id: string;
  statement: string;
  evidence: ClaimEvidenceInput[];
}

export interface ClaimEvidence {
  id: string;
  project_id: string;
  claim_id: string;
  kind: ClaimEvidenceKind;
  source: string;
  data: unknown;
  hash: string | null;
  json_path: string | null;
  expected_value: unknown;
  created_at: number;
}

export interface Claim {
  id: string;
  project_id: string;
  subject_type: string;
  subject_id: string;
  statement: string;
  status: ClaimStatus;
  created_at: number;
  updated_at: number;
  evidence?: ClaimEvidence[];
}

export interface ClaimVerificationEvidenceResult {
  evidence_id: string;
  kind: ClaimEvidenceKind;
  source: string;
  passed: boolean;
  message: string;
}

export interface ClaimVerificationRun {
  id: string;
  project_id: string;
  claim_id: string;
  status: Exclude<ClaimStatus, "pending">;
  details: {
    results: ClaimVerificationEvidenceResult[];
  };
  created_at: number;
}

export interface ListClaimsParams {
  subject_type?: string;
  subject_id?: string;
  cursor?: string;
  limit?: number;
  order?: StateOrder;
}

export interface ListConversationsParams {
  limit?: number;
  cursor?: string;
  order?: StateOrder;
  /** Exact-match filter: only return conversations tagged with this exact tag. */
  tag?: string;
}

type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

/** HTTP methods that are safe to retry automatically without side effects. */
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);

/**
 * Parse an HTTP `Retry-After` header into a delay in milliseconds.
 * Supports both delta-seconds (e.g. `"5"`) and HTTP-date formats.
 * Returns null when the header is absent or unparseable.
 */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

export class AgentState {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private timeoutMs: number;

  constructor(config: AgentStateConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://agentstate.app/api";
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
    this.timeoutMs = config.timeout ?? 30_000;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    };

    // Only retry when it is safe to do so. Idempotent methods can always be
    // replayed; a non-idempotent POST is only replayed when the caller supplied
    // an Idempotency-Key, so the server can dedupe the retried request.
    const method = (options?.method ?? "GET").toUpperCase();
    const hasIdempotencyKey = Object.keys(headers).some(
      (key) => key.toLowerCase() === "idempotency-key",
    );
    const retriable = IDEMPOTENT_METHODS.has(method) || hasIdempotencyKey;
    const maxRetries = retriable ? this.maxRetries : 0;

    let lastError: Error | null = null;
    // Delay to apply before the next attempt. Derived from Retry-After when the
    // server provides it, otherwise exponential backoff with jitter.
    let nextDelayMs: number | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = this.retryDelayMs * 2 ** (attempt - 1);
        // Full jitter on the exponential backoff to avoid thundering herds.
        const jittered = backoff + Math.floor(Math.random() * backoff);
        const delay = nextDelayMs ?? jittered;
        nextDelayMs = null;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        let res: Response;
        try {
          res = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        // Retry on 429 and 5xx
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
          // Honor Retry-After (seconds or HTTP-date) for the next delay.
          if (res.status === 429) {
            nextDelayMs = parseRetryAfter(res.headers.get("Retry-After"));
          }
          lastError = new AgentStateError(
            `Retriable server error: ${res.status}`,
            "SERVER_ERROR",
            res.status,
          );
          continue;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new AgentStateError(
            (body as { error?: { message?: string } })?.error?.message || `API error ${res.status}`,
            (body as { error?: { code?: string } })?.error?.code || "UNKNOWN",
            res.status,
          );
        }

        if (res.status === 204) return undefined as T;
        return res.json() as Promise<T>;
      } catch (error) {
        if (error instanceof AgentStateError) throw error;
        // Network errors — retry
        lastError = error as Error;
        if (attempt === maxRetries) throw lastError;
      }
    }

    throw lastError;
  }

  private withQuery(path: string, params?: object): string {
    if (!params) return path;

    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params) as [string, QueryParamValue][]) {
      if (value === undefined || value === null) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        query.append(key, String(item));
      }
    }

    const qs = query.toString();
    return qs ? `${path}?${qs}` : path;
  }

  // Conversations
  async createConversation(data: {
    external_id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    messages?: Omit<Message, "id" | "created_at">[];
  }): Promise<ConversationWithMessages> {
    return this.request("/v1/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getConversation(id: string): Promise<ConversationWithMessages> {
    return this.request(`/v1/conversations/${id}`);
  }

  async getConversationByExternalId(externalId: string): Promise<ConversationWithMessages> {
    return this.request(`/v1/conversations/by-external-id/${encodeURIComponent(externalId)}`);
  }

  async listConversations(params?: ListConversationsParams): Promise<ListResponse<Conversation>> {
    return this.request(this.withQuery("/v1/conversations", params));
  }

  async updateConversation(
    id: string,
    data: {
      title?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Conversation> {
    return this.request(`/v1/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    return this.request(`/v1/conversations/${id}`, { method: "DELETE" });
  }

  // Messages
  async appendMessages(
    conversationId: string,
    messages: Omit<Message, "id" | "created_at">[],
  ): Promise<{ messages: Message[] }> {
    return this.request(`/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messages }),
    });
  }

  async listMessages(
    conversationId: string,
    params?: {
      limit?: number;
      after?: string;
    },
  ): Promise<ListResponse<Message>> {
    return this.request(this.withQuery(`/v1/conversations/${conversationId}/messages`, params));
  }

  // AI
  async generateTitle(conversationId: string): Promise<{ title: string }> {
    return this.request(`/v1/conversations/${conversationId}/generate-title`, { method: "POST" });
  }

  async generateFollowUps(conversationId: string): Promise<{ questions: string[] }> {
    return this.request(`/v1/conversations/${conversationId}/follow-ups`, { method: "POST" });
  }

  // Export
  async exportConversations(
    ids?: string[],
  ): Promise<{ data: ConversationWithMessages[]; count: number }> {
    return this.request("/v1/conversations/export", {
      method: "POST",
      body: JSON.stringify(ids ? { ids } : {}),
    });
  }

  // State records
  async upsertState(
    stateKey: string,
    data: UpsertStateRequest,
    options?: { idempotencyKey?: string },
  ): Promise<StateRecord> {
    return this.request(`/v1/states/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      headers: options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
      body: JSON.stringify(data),
    });
  }

  async getState(
    stateKey: string,
    params?: { at_sequence?: number; at_time?: number },
  ): Promise<StateRecord> {
    return this.request(this.withQuery(`/v1/states/${encodeURIComponent(stateKey)}`, params));
  }

  async queryStates(query: StateQueryRequest = {}): Promise<StateListResponse<StateRecord>> {
    return this.request("/v1/states/query", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  async deleteState(
    stateKey: string,
    params?: DeleteStateRequest & { idempotencyKey?: string },
  ): Promise<{ deleted: true; event: StateEvent }> {
    return this.request(
      this.withQuery(`/v1/states/${encodeURIComponent(stateKey)}`, {
        lease_id: params?.lease_id,
      }),
      {
        method: "DELETE",
        headers: params?.idempotencyKey ? { "Idempotency-Key": params.idempotencyKey } : undefined,
      },
    );
  }

  // State events and watch reads
  async listStateEvents(
    stateKey: string,
    params?: ListStateEventsParams,
    options?: { capabilityToken?: string },
  ): Promise<StateListResponse<StateEvent>> {
    return this.request(
      this.withQuery(`/v1/states/${encodeURIComponent(stateKey)}/events`, params),
      {
        headers: options?.capabilityToken
          ? { Authorization: `Bearer ${options.capabilityToken}` }
          : undefined,
      },
    );
  }

  // State leases
  async createStateLease(stateKey: string, data: CreateStateLeaseRequest): Promise<StateLease> {
    return this.request(`/v1/states/${encodeURIComponent(stateKey)}/lease`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async renewStateLease(
    id: string,
    data: RenewStateLeaseRequest = {},
    options?: { capabilityToken?: string },
  ): Promise<StateLease> {
    return this.request(`/v1/leases/${encodeURIComponent(id)}/renew`, {
      method: "POST",
      headers: options?.capabilityToken
        ? { Authorization: `Bearer ${options.capabilityToken}` }
        : undefined,
      body: JSON.stringify(data),
    });
  }

  async releaseStateLease(id: string, options?: { capabilityToken?: string }): Promise<void> {
    return this.request(`/v1/leases/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: options?.capabilityToken
        ? { Authorization: `Bearer ${options.capabilityToken}` }
        : undefined,
    });
  }

  // Capability tokens
  async createCapabilityToken(data: CreateCapabilityTokenRequest): Promise<CapabilityTokenCreated> {
    return this.request("/v1/capability-tokens", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listCapabilityTokens(): Promise<CapabilityTokenListResponse> {
    return this.request("/v1/capability-tokens");
  }

  async revokeCapabilityToken(id: string): Promise<void> {
    return this.request(`/v1/capability-tokens/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // Claims
  async createClaim(data: CreateClaimRequest): Promise<Claim> {
    return this.request("/v1/claims", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listClaims(params?: ListClaimsParams): Promise<StateListResponse<Claim>> {
    return this.request(this.withQuery("/v1/claims", params));
  }

  async getClaim(id: string): Promise<Claim> {
    return this.request(`/v1/claims/${encodeURIComponent(id)}`);
  }

  async verifyClaim(id: string): Promise<ClaimVerificationRun> {
    return this.request(`/v1/claims/${encodeURIComponent(id)}/verify`, {
      method: "POST",
    });
  }
}

export class AgentStateError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AgentStateError";
    this.code = code;
    this.status = status;
  }
}
