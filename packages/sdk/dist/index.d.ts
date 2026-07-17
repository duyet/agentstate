interface AgentStateConfig {
    apiKey: string;
    baseUrl?: string;
    /** Max retry attempts for transient errors (429, 5xx, network). Default: 3 */
    maxRetries?: number;
    /** Base delay in ms for exponential backoff. Default: 1000 */
    retryDelayMs?: number;
    /** Request timeout in ms. Default: 30000 */
    timeout?: number;
}
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}
interface Message {
    id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    metadata?: Record<string, unknown>;
    token_count?: number;
    created_at?: number;
}
interface Conversation {
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
interface ConversationWithMessages extends Conversation {
    messages: Message[];
}
interface ListResponse<T> {
    data: T[];
    pagination: {
        limit: number;
        next_cursor: string | null;
    };
}
interface ConversationSearchResult {
    id: string;
    title: string | null;
    /** Matching-message excerpt with ellipsis where truncated. */
    snippet: string;
    message_count: number;
    created_at: number;
    updated_at: number;
}
interface SearchConversationsResponse {
    data: ConversationSearchResult[];
    next_cursor: string | null;
}
interface TraceObservationInput {
    role?: "user" | "assistant" | "system" | "tool";
    content: string;
    parent_message_id?: string;
    observation_type: string;
    metadata?: Record<string, unknown>;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    token_count?: number;
    cost_microdollars?: number;
    start_time?: number;
    end_time?: number;
    status?: string;
    level?: string;
}
interface IngestTraceRequest {
    trace: {
        external_id?: string;
        title?: string;
        metadata?: Record<string, unknown>;
    };
    observations: TraceObservationInput[];
}
interface TraceListResponse {
    data: Conversation[];
    has_more: boolean;
    next_cursor: string | null;
}
/** A message persisted as a trace observation (flat, as returned by ingestTrace). */
interface TraceObservationRecord extends Message {
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_microdollars: number | null;
    parent_message_id: string | null;
    observation_type: string | null;
    start_time: number | null;
    end_time: number | null;
    status: string | null;
    level: string | null;
}
/** A trace observation with nested child spans (tree form, as returned by getTrace). */
type TraceObservation = TraceObservationRecord & {
    children: TraceObservation[];
};
type TraceTree = Conversation & {
    observations: TraceObservation[];
};
interface IngestTraceResponse {
    conversation: Conversation;
    observations: TraceObservationRecord[];
}
interface SearchConversationsParams {
    /** Search query — matches message content (case-insensitive substring). */
    q: string;
    limit?: number;
    cursor?: string;
}
interface ListTracesParams {
    limit?: number;
    cursor?: string;
    order?: StateOrder;
}
type StateOrder = "asc" | "desc";
type StateEventType = "upsert" | "delete";
type CapabilityTokenScope = "state:read" | "state:write" | "state:watch" | "lease:write" | "claim:write";
type ClaimStatus = "pending" | "verified" | "failed";
type ClaimEvidenceKind = "state_event" | "text_hash" | "json_value";
interface StateListResponse<T> {
    data: T[];
    pagination: {
        limit: number;
        next_cursor: string | null;
    };
}
interface StateRecord {
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
interface UpsertStateRequest {
    agent_id: string;
    data: JsonObject;
    metadata?: JsonObject;
    tags?: string[];
    lease_id?: string;
}
interface StateQueryPredicate {
    path: string;
    equals: JsonValue;
}
interface StateQueryRequest {
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
interface StateEvent {
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
interface ListStateEventsParams {
    /**
     * Exclusive NUMERIC sequence cursor: returns events with `sequence > after`
     * (ascending). Pass the last event's `sequence` from the previous page.
     * Not interchangeable with the opaque string cursors used by
     * `listMessages` (message-id) or `queryStates` (`next_cursor`).
     */
    after?: number;
    limit?: number;
}
interface DeleteStateRequest {
    lease_id?: string;
}
interface CreateStateLeaseRequest {
    holder: string;
    ttl_ms?: number;
}
interface RenewStateLeaseRequest {
    ttl_ms?: number;
}
interface StateLease {
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
interface CreateCapabilityTokenRequest {
    name: string;
    scopes: CapabilityTokenScope[];
    expires_at?: number;
}
interface CapabilityToken {
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
interface CapabilityTokenCreated extends CapabilityToken {
    token: string;
}
interface CapabilityTokenListResponse {
    data: CapabilityToken[];
}
interface TextHashClaimEvidenceInput {
    kind: "text_hash";
    source: string;
    data: string;
    hash: string;
}
interface JsonValueClaimEvidenceInput {
    kind: "json_value";
    source: string;
    data: JsonValue;
    json_path: string;
    expected_value: JsonValue;
}
interface StateEventClaimEvidenceInput {
    kind: "state_event";
    source: string;
    hash?: string;
    json_path?: string;
    expected_value?: JsonValue;
}
type ClaimEvidenceInput = TextHashClaimEvidenceInput | JsonValueClaimEvidenceInput | StateEventClaimEvidenceInput;
interface CreateClaimRequest {
    subject_type: string;
    subject_id: string;
    statement: string;
    evidence: ClaimEvidenceInput[];
}
interface ClaimEvidence {
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
interface Claim {
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
interface ClaimVerificationEvidenceResult {
    evidence_id: string;
    kind: ClaimEvidenceKind;
    source: string;
    passed: boolean;
    message: string;
}
interface ClaimVerificationRun {
    id: string;
    project_id: string;
    claim_id: string;
    status: Exclude<ClaimStatus, "pending">;
    details: {
        results: ClaimVerificationEvidenceResult[];
    };
    created_at: number;
}
interface ListClaimsParams {
    subject_type?: string;
    subject_id?: string;
    cursor?: string;
    limit?: number;
    order?: StateOrder;
}
interface ListConversationsParams {
    limit?: number;
    cursor?: string;
    order?: StateOrder;
    /** Exact-match filter: only return conversations tagged with this exact tag. */
    tag?: string;
}
declare class AgentState {
    private apiKey;
    private baseUrl;
    private maxRetries;
    private retryDelayMs;
    private timeoutMs;
    constructor(config: AgentStateConfig);
    private request;
    private withQuery;
    createConversation(data: {
        external_id?: string;
        title?: string;
        metadata?: Record<string, unknown>;
        messages?: Omit<Message, "id" | "created_at">[];
    }): Promise<ConversationWithMessages>;
    getConversation(id: string): Promise<ConversationWithMessages>;
    getConversationByExternalId(externalId: string): Promise<ConversationWithMessages>;
    listConversations(params?: ListConversationsParams): Promise<ListResponse<Conversation>>;
    searchConversations(params: SearchConversationsParams): Promise<SearchConversationsResponse>;
    updateConversation(id: string, data: {
        title?: string;
        metadata?: Record<string, unknown>;
    }): Promise<Conversation>;
    deleteConversation(id: string): Promise<void>;
    bulkDeleteConversations(ids: string[]): Promise<{
        deleted: number;
    }>;
    appendMessages(conversationId: string, messages: Omit<Message, "id" | "created_at">[]): Promise<{
        messages: Message[];
    }>;
    listMessages(conversationId: string, params?: {
        limit?: number;
        /**
         * Opaque message-id cursor: pass `pagination.next_cursor` from the
         * previous page. NOT a numeric sequence — not interchangeable with
         * `listStateEvents`' `after`.
         */
        after?: string;
    }): Promise<ListResponse<Message>>;
    generateTitle(conversationId: string): Promise<{
        title: string;
    }>;
    generateFollowUps(conversationId: string): Promise<{
        questions: string[];
    }>;
    generateAll(conversationId: string): Promise<{
        title: string;
        follow_ups: string[];
    }>;
    exportConversations(ids?: string[]): Promise<{
        data: ConversationWithMessages[];
        count: number;
    }>;
    ingestTrace(data: IngestTraceRequest): Promise<IngestTraceResponse>;
    listTraces(params?: ListTracesParams): Promise<TraceListResponse>;
    getTrace(id: string): Promise<TraceTree>;
    upsertState(stateKey: string, data: UpsertStateRequest, options?: {
        idempotencyKey?: string;
    }): Promise<StateRecord>;
    getState(stateKey: string, params?: {
        at_sequence?: number;
        at_time?: number;
    }): Promise<StateRecord>;
    queryStates(query?: StateQueryRequest): Promise<StateListResponse<StateRecord>>;
    deleteState(stateKey: string, params?: DeleteStateRequest & {
        idempotencyKey?: string;
    }): Promise<{
        deleted: true;
        event: StateEvent;
    }>;
    listStateEvents(stateKey: string, params?: ListStateEventsParams, options?: {
        capabilityToken?: string;
    }): Promise<StateListResponse<StateEvent>>;
    createStateLease(stateKey: string, data: CreateStateLeaseRequest): Promise<StateLease>;
    renewStateLease(id: string, data?: RenewStateLeaseRequest, options?: {
        capabilityToken?: string;
    }): Promise<StateLease>;
    releaseStateLease(id: string, options?: {
        capabilityToken?: string;
    }): Promise<void>;
    createCapabilityToken(data: CreateCapabilityTokenRequest): Promise<CapabilityTokenCreated>;
    listCapabilityTokens(): Promise<CapabilityTokenListResponse>;
    revokeCapabilityToken(id: string): Promise<void>;
    createClaim(data: CreateClaimRequest): Promise<Claim>;
    listClaims(params?: ListClaimsParams): Promise<StateListResponse<Claim>>;
    getClaim(id: string): Promise<Claim>;
    verifyClaim(id: string): Promise<ClaimVerificationRun>;
}
declare class AgentStateError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number);
}

export { AgentState, type AgentStateConfig, AgentStateError, type CapabilityToken, type CapabilityTokenCreated, type CapabilityTokenListResponse, type CapabilityTokenScope, type Claim, type ClaimEvidence, type ClaimEvidenceInput, type ClaimEvidenceKind, type ClaimStatus, type ClaimVerificationEvidenceResult, type ClaimVerificationRun, type Conversation, type ConversationSearchResult, type ConversationWithMessages, type CreateCapabilityTokenRequest, type CreateClaimRequest, type CreateStateLeaseRequest, type DeleteStateRequest, type IngestTraceRequest, type IngestTraceResponse, type JsonObject, type JsonPrimitive, type JsonValue, type JsonValueClaimEvidenceInput, type ListClaimsParams, type ListConversationsParams, type ListResponse, type ListStateEventsParams, type ListTracesParams, type Message, type RenewStateLeaseRequest, type SearchConversationsParams, type SearchConversationsResponse, type StateEvent, type StateEventClaimEvidenceInput, type StateEventType, type StateLease, type StateListResponse, type StateOrder, type StateQueryPredicate, type StateQueryRequest, type StateRecord, type TextHashClaimEvidenceInput, type TraceListResponse, type TraceObservation, type TraceObservationInput, type TraceObservationRecord, type TraceTree, type UpsertStateRequest };
