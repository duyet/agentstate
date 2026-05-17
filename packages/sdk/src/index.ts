export interface AgentStateConfig {
  apiKey: string;
  baseUrl?: string; // defaults to "https://agentstate.app/api"
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

type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

export class AgentState {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AgentStateConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://agentstate.app/api";
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
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

  async listConversations(params?: {
    limit?: number;
    cursor?: string;
    order?: "asc" | "desc";
  }): Promise<ListResponse<Conversation>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);
    if (params?.order) query.set("order", params.order);
    const qs = query.toString();
    return this.request(`/v1/conversations${qs ? `?${qs}` : ""}`);
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
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.after) query.set("after", params.after);
    const qs = query.toString();
    return this.request(`/v1/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`);
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
    return this.request(`/v2/states/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      headers: options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
      body: JSON.stringify(data),
    });
  }

  async getState(
    stateKey: string,
    params?: { at_sequence?: number; at_time?: number },
  ): Promise<StateRecord> {
    return this.request(this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}`, params));
  }

  async queryStates(query: StateQueryRequest = {}): Promise<StateListResponse<StateRecord>> {
    return this.request("/v2/states/query", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  async deleteState(
    stateKey: string,
    params?: DeleteStateRequest & { idempotencyKey?: string },
  ): Promise<{ deleted: true; event: StateEvent }> {
    return this.request(
      this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}`, {
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
      this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}/events`, params),
      {
        headers: options?.capabilityToken
          ? { Authorization: `Bearer ${options.capabilityToken}` }
          : undefined,
      },
    );
  }

  // State leases
  async createStateLease(stateKey: string, data: CreateStateLeaseRequest): Promise<StateLease> {
    return this.request(`/v2/states/${encodeURIComponent(stateKey)}/lease`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async renewStateLease(
    id: string,
    data: RenewStateLeaseRequest = {},
    options?: { capabilityToken?: string },
  ): Promise<StateLease> {
    return this.request(`/v2/leases/${encodeURIComponent(id)}/renew`, {
      method: "POST",
      headers: options?.capabilityToken
        ? { Authorization: `Bearer ${options.capabilityToken}` }
        : undefined,
      body: JSON.stringify(data),
    });
  }

  async releaseStateLease(id: string, options?: { capabilityToken?: string }): Promise<void> {
    return this.request(`/v2/leases/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: options?.capabilityToken
        ? { Authorization: `Bearer ${options.capabilityToken}` }
        : undefined,
    });
  }

  // Capability tokens
  async createCapabilityToken(data: CreateCapabilityTokenRequest): Promise<CapabilityTokenCreated> {
    return this.request("/v2/capability-tokens", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listCapabilityTokens(): Promise<CapabilityTokenListResponse> {
    return this.request("/v2/capability-tokens");
  }

  async revokeCapabilityToken(id: string): Promise<void> {
    return this.request(`/v2/capability-tokens/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // Claims
  async createClaim(data: CreateClaimRequest): Promise<Claim> {
    return this.request("/v2/claims", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listClaims(params?: ListClaimsParams): Promise<StateListResponse<Claim>> {
    return this.request(this.withQuery("/v2/claims", params));
  }

  async getClaim(id: string): Promise<Claim> {
    return this.request(`/v2/claims/${encodeURIComponent(id)}`);
  }

  async verifyClaim(id: string): Promise<ClaimVerificationRun> {
    return this.request(`/v2/claims/${encodeURIComponent(id)}/verify`, {
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
