export interface AgentStateConfig {
  apiKey: string;
  baseUrl?: string; // defaults to "https://agentstate.app/api"
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
        "Authorization": `Bearer ${this.apiKey}`,
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

  async updateConversation(id: string, data: {
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Conversation> {
    return this.request(`/v1/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    return this.request(`/v1/conversations/${id}`, { method: "DELETE" });
  }

  // Messages
  async appendMessages(conversationId: string, messages: Omit<Message, "id" | "created_at">[]): Promise<{ messages: Message[] }> {
    return this.request(`/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messages }),
    });
  }

  async listMessages(conversationId: string, params?: {
    limit?: number;
    after?: string;
  }): Promise<ListResponse<Message>> {
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
  async exportConversations(ids?: string[]): Promise<{ data: ConversationWithMessages[]; count: number }> {
    return this.request("/v1/conversations/export", {
      method: "POST",
      body: JSON.stringify(ids ? { ids } : {}),
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
