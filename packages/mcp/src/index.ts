#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const apiKey = process.env.AGENTSTATE_API_KEY;
const baseUrl = (process.env.AGENTSTATE_BASE_URL ?? "https://agentstate.app/api").replace(
  /\/$/,
  "",
);

if (!apiKey) {
  process.stderr.write(
    "Error: AGENTSTATE_API_KEY environment variable is required.\n" +
      "Get a free key at https://agentstate.app\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

interface ApiError {
  error: { code: string; message: string };
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit & { authKey?: string },
): Promise<T> {
  const key = options?.authKey ?? apiKey!;
  const url = `${baseUrl}${path}`;
  const { authKey: _drop, ...fetchOptions } = options ?? {};

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = (body as ApiError)?.error;
    // Return an error result without leaking the key
    throw new ApiCallError(
      err?.message ?? `HTTP ${res.status}`,
      err?.code ?? "UNKNOWN",
      res.status,
    );
  }

  return body as T;
}

class ApiCallError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  if (!params) return path;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.append(k, String(v));
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

// Wraps an async handler so any thrown error becomes an MCP error content block
// instead of crashing the server.
function toolHandler<T>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      const result = await fn(args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const msg = err instanceof ApiCallError ? `${err.code}: ${err.message}` : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${msg}` }],
        isError: true,
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Zod schemas shared across tools
// ---------------------------------------------------------------------------

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  token_count: z.number().int().optional(),
});

const claimEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text_hash"),
    source: z.string(),
    data: z.string(),
    hash: z.string(),
  }),
  z.object({
    kind: z.literal("json_value"),
    source: z.string(),
    data: z.unknown(),
    json_path: z.string(),
    expected_value: z.unknown(),
  }),
  z.object({
    kind: z.literal("state_event"),
    source: z.string(),
    hash: z.string().optional(),
    json_path: z.string().optional(),
    expected_value: z.unknown().optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Server registration
// ---------------------------------------------------------------------------

const server = new McpServer(
  { name: "agentstate", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

// --- Conversations ---

server.tool(
  "store_conversation",
  "Create a new conversation with an optional list of messages. Returns the conversation record including generated ID.",
  {
    external_id: z.string().optional().describe("Optional external identifier for deduplication"),
    title: z.string().optional().describe("Human-readable title for the conversation"),
    metadata: z.record(z.unknown()).optional().describe("Arbitrary JSON metadata"),
    messages: z.array(messageSchema).optional().describe("Initial messages to include"),
  },
  toolHandler(async (args) =>
    apiRequest("/v1/conversations", {
      method: "POST",
      body: JSON.stringify(args),
    }),
  ),
);

server.tool(
  "recall_conversation",
  "Retrieve a conversation by its ID, including all stored messages.",
  {
    id: z.string().describe("Conversation ID (e.g. conv_abc123)"),
  },
  toolHandler(async ({ id }) => apiRequest(`/v1/conversations/${encodeURIComponent(id)}`)),
);

server.tool(
  "list_conversations",
  "List conversations for the current project with optional pagination and filtering.",
  {
    limit: z.number().int().min(1).max(100).optional().describe("Max results (1–100)"),
    cursor: z.string().optional().describe("Pagination cursor from previous response"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order by creation time"),
    tag: z.string().optional().describe("Filter: only return conversations with this exact tag"),
  },
  toolHandler(async (args) =>
    apiRequest(
      withQuery("/v1/conversations", {
        limit: args.limit,
        cursor: args.cursor,
        order: args.order,
        tag: args.tag,
      }),
    ),
  ),
);

// --- State ---

server.tool(
  "upsert_state",
  "Write (create or overwrite) a state record at the given state_key. Optionally pass a lease_id for fenced writes.",
  {
    state_key: z.string().describe("Dot-separated key path, e.g. agent:worker-1:progress"),
    agent_id: z.string().describe("Identifier of the agent that owns this state"),
    data: z.record(z.unknown()).describe("JSON object to store"),
    metadata: z.record(z.unknown()).optional().describe("Optional metadata JSON object"),
    tags: z.array(z.string()).optional().describe("Tags for filtering and querying"),
    lease_id: z.string().optional().describe("Lease ID for fenced write — prevents stale writes"),
    idempotency_key: z
      .string()
      .optional()
      .describe("Optional idempotency key for exactly-once semantics"),
  },
  toolHandler(async ({ state_key, idempotency_key, ...body }) =>
    apiRequest(`/v1/states/${encodeURIComponent(state_key)}`, {
      method: "PUT",
      headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined,
      body: JSON.stringify(body),
    }),
  ),
);

server.tool(
  "get_state",
  "Read the current state record at state_key. Optionally read at a historical sequence or timestamp.",
  {
    state_key: z.string().describe("State key to read"),
    at_sequence: z.number().int().optional().describe("Read state as of this sequence number"),
    at_time: z.number().int().optional().describe("Read state as of this Unix-ms timestamp"),
  },
  toolHandler(async ({ state_key, at_sequence, at_time }) =>
    apiRequest(
      withQuery(`/v1/states/${encodeURIComponent(state_key)}`, {
        at_sequence,
        at_time,
      }),
    ),
  ),
);

server.tool(
  "query_states",
  "Query state records across the project with flexible filters (agent, tags, JSON path, time range).",
  {
    agent_id: z.string().optional().describe("Filter by agent ID"),
    tags: z.array(z.string()).optional().describe("Filter: all records that have these tags"),
    updated_after: z
      .number()
      .int()
      .optional()
      .describe("Unix-ms — only records updated after this time"),
    updated_before: z
      .number()
      .int()
      .optional()
      .describe("Unix-ms — only records updated before this time"),
    json_path: z.string().optional().describe("JSON path expression, e.g. $.status"),
    json_equals: z.unknown().optional().describe("Value that json_path must equal"),
    at_sequence: z.number().int().optional().describe("Read state as of this sequence"),
    at_time: z.number().int().optional().describe("Read state as of this Unix-ms timestamp"),
    limit: z.number().int().min(1).max(100).optional().describe("Max results"),
    cursor: z.string().optional().describe("Pagination cursor"),
  },
  toolHandler(async (args) =>
    apiRequest("/v1/states/query", {
      method: "POST",
      body: JSON.stringify(args),
    }),
  ),
);

// --- Leases ---

server.tool(
  "acquire_lease",
  "Acquire a distributed lease on state_key. Returns 409 if already held. Use the lease_id for fenced state writes.",
  {
    state_key: z.string().describe("State key to lock, e.g. task:order-42"),
    holder: z.string().describe("Identifier of the agent trying to acquire the lease"),
    ttl_ms: z
      .number()
      .int()
      .min(1000)
      .optional()
      .describe(
        "Lease TTL in milliseconds (server default: 60000). Lease expires automatically if not renewed or released.",
      ),
  },
  toolHandler(async ({ state_key, ...body }) =>
    apiRequest(`/v1/states/${encodeURIComponent(state_key)}/lease`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ),
);

server.tool(
  "renew_lease",
  "Renew an active lease before it expires. Must be called while the lease is still valid (not yet expired).",
  {
    lease_id: z.string().describe("Lease ID returned by acquire_lease"),
    ttl_ms: z.number().int().min(1000).optional().describe("New TTL in milliseconds from now"),
  },
  toolHandler(async ({ lease_id, ...body }) =>
    apiRequest(`/v1/leases/${encodeURIComponent(lease_id)}/renew`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ),
);

server.tool(
  "release_lease",
  "Release a held lease immediately, making the state key available to the next acquirer.",
  {
    lease_id: z.string().describe("Lease ID to release"),
  },
  toolHandler(async ({ lease_id }) =>
    apiRequest(`/v1/leases/${encodeURIComponent(lease_id)}`, {
      method: "DELETE",
    }),
  ),
);

// --- Claims ---

server.tool(
  "create_claim",
  "Create a verifiable claim about a subject (e.g. a conversation or API call) with attached evidence. Status starts as 'pending'; call verify_claim to evaluate it.",
  {
    subject_type: z.string().describe("Type of subject, e.g. 'conversation' or 'api-call'"),
    subject_id: z.string().describe("ID of the subject being claimed about"),
    statement: z.string().describe("Human-readable assertion, e.g. 'The summary is accurate'"),
    evidence: z
      .array(claimEvidenceSchema)
      .min(1)
      .describe(
        "Evidence list. Each item is one of: text_hash (SHA-256 of text), json_value (JSON path assertion), or state_event (tied to a state event).",
      ),
  },
  toolHandler(async (args) =>
    apiRequest("/v1/claims", {
      method: "POST",
      body: JSON.stringify(args),
    }),
  ),
);

server.tool(
  "verify_claim",
  "Trigger a verification run for an existing claim. Re-evaluates all evidence items and returns 'verified' or 'failed' with per-item details.",
  {
    claim_id: z.string().describe("Claim ID to verify"),
  },
  toolHandler(async ({ claim_id }) =>
    apiRequest(`/v1/claims/${encodeURIComponent(claim_id)}/verify`, {
      method: "POST",
    }),
  ),
);

// --- Capability Tokens ---

server.tool(
  "mint_capability_token",
  "Mint a scoped capability token for delegation to sub-agents. The raw token is shown once — store it before discarding the response.",
  {
    name: z.string().describe("Human-readable name for the token, e.g. 'summarizer-subagent'"),
    scopes: z
      .array(z.enum(["state:read", "state:write", "state:watch", "lease:write", "claim:write"]))
      .min(1)
      .describe(
        "Scopes to grant. Options: state:read, state:write, state:watch, lease:write, claim:write",
      ),
    expires_at: z.number().int().optional().describe("Unix-ms expiry timestamp for the token"),
  },
  toolHandler(async (args) =>
    apiRequest("/v1/capability-tokens", {
      method: "POST",
      body: JSON.stringify(args),
    }),
  ),
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
