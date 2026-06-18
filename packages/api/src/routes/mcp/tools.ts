import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { conversations as conversationsTable, messages as messagesTable } from "../../db/schema";
import { GrantableScopeSchema, scopesSatisfyAll } from "../../lib/scopes";
import { deserializeConversationFull, deserializeMessage } from "../../lib/serialization";
import { CapabilityScopeSchema } from "../../lib/validation";
import * as capabilityTokensService from "../../services/capability-tokens";
import * as claimsService from "../../services/claims";
import * as keysService from "../../services/keys";
import * as leasesService from "../../services/leases";
import * as statesService from "../../services/states";
import * as conversationsService from "../../services/v2-conversations";
import type { Bindings, Variables } from "../../types";

export type ToolContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema object advertised to MCP clients via tools/list. */
  inputSchema: Record<string, unknown>;
  /** Scope the caller must hold (checked before the handler runs). */
  requiredScope: string;
  /** Zod schema used to validate `params.arguments` before dispatch. */
  zodSchema: z.ZodTypeAny;
  handler: (c: ToolContext, args: any) => Promise<unknown>;
}

/**
 * Error thrown by a tool handler that maps to a domain error code. Surfaced to
 * the client as an `isError` result with `CODE: message` text.
 */
export class ToolError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Shared zod shapes — reused from the stdio MCP (packages/mcp) so the remote
// and local servers advertise identical tool input shapes.
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
// Per-tool argument schemas
// ---------------------------------------------------------------------------

const storeConversationSchema = z.object({
  external_id: z.string().optional().describe("Optional external identifier for deduplication"),
  title: z.string().optional().describe("Human-readable title for the conversation"),
  metadata: z.record(z.unknown()).optional().describe("Arbitrary JSON metadata"),
  messages: z.array(messageSchema).optional().describe("Initial messages to include"),
});

const recallConversationSchema = z.object({
  id: z.string().describe("Conversation ID"),
});

const listConversationsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().describe("Max results (1–100)"),
  cursor: z.string().optional().describe("Pagination cursor from previous response"),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order by creation time"),
  tag: z.string().optional().describe("Filter: only return conversations with this exact tag"),
});

const upsertStateSchema = z.object({
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
});

const getStateSchema = z.object({
  state_key: z.string().describe("State key to read"),
  at_sequence: z.number().int().optional().describe("Read state as of this sequence number"),
  at_time: z.number().int().optional().describe("Read state as of this Unix-ms timestamp"),
});

const queryStatesSchema = z.object({
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
});

const acquireLeaseSchema = z.object({
  state_key: z.string().describe("State key to lock, e.g. task:order-42"),
  holder: z.string().describe("Identifier of the agent trying to acquire the lease"),
  ttl_ms: z
    .number()
    .int()
    .min(1000)
    .optional()
    .describe("Lease TTL in milliseconds (server default: 60000)."),
});

const renewLeaseSchema = z.object({
  lease_id: z.string().describe("Lease ID returned by acquire_lease"),
  ttl_ms: z.number().int().min(1000).optional().describe("New TTL in milliseconds from now"),
});

const releaseLeaseSchema = z.object({
  lease_id: z.string().describe("Lease ID to release"),
});

const createClaimSchema = z.object({
  subject_type: z.string().describe("Type of subject, e.g. 'conversation' or 'api-call'"),
  subject_id: z.string().describe("ID of the subject being claimed about"),
  statement: z.string().describe("Human-readable assertion, e.g. 'The summary is accurate'"),
  evidence: z
    .array(claimEvidenceSchema)
    .min(1)
    .describe("Evidence list. Each item is one of: text_hash, json_value, or state_event."),
});

const verifyClaimSchema = z.object({
  claim_id: z.string().describe("Claim ID to verify"),
});

const mintCapabilityTokenSchema = z.object({
  name: z.string().describe("Human-readable name for the token, e.g. 'summarizer-subagent'"),
  scopes: z
    .array(CapabilityScopeSchema)
    .min(1)
    .describe("Scopes: state:read, state:write, state:watch, lease:write, claim:write"),
  expires_at: z.number().int().optional().describe("Unix-ms expiry timestamp for the token"),
});

const createApiKeySchema = z.object({
  name: z.string().describe("Human-readable name for the new API key"),
  scopes: z
    .array(GrantableScopeSchema)
    .min(1)
    .optional()
    .describe(
      "Scopes to grant. Must be a subset of the caller's scopes. Omit to inherit the caller's scopes.",
    ),
});

const listApiKeysSchema = z.object({});

const revokeApiKeySchema = z.object({
  id: z.string().describe("API key ID to revoke"),
});

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function recallConversation(c: ToolContext, id: string) {
  const db = c.get("db");
  const projectId = c.get("projectId");
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.projectId, projectId)))
    .limit(1);

  if (!conversation) throw new ToolError("NOT_FOUND", "Conversation not found");

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(messagesTable.createdAt);

  return {
    ...deserializeConversationFull(conversation),
    messages: msgs.map(deserializeMessage),
  };
}

// ---------------------------------------------------------------------------
// JSON Schema generation
// ---------------------------------------------------------------------------

function jsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const generated = zodToJsonSchema(schema, {
    target: "openApi3",
    $refStrategy: "none",
  }) as Record<string, unknown>;
  // MCP clients expect a bare JSON Schema object; drop the $schema key.
  const { $schema, ...rest } = generated;
  return rest;
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const TOOLS: ToolDefinition[] = [
  // --- Conversations ---
  {
    name: "store_conversation",
    description:
      "Create a new conversation with an optional list of messages. Returns the conversation record including generated ID.",
    requiredScope: "conversations:write",
    zodSchema: storeConversationSchema,
    inputSchema: jsonSchema(storeConversationSchema),
    handler: async (c, args: z.infer<typeof storeConversationSchema>) => {
      const result = await conversationsService.createConversation(c.get("db"), {
        projectId: c.get("projectId"),
        externalId: args.external_id ?? null,
        title: args.title ?? null,
        metadata: args.metadata ?? null,
        inputMessages: args.messages,
      });
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return {
        id: result.conversationId,
        project_id: result.projectId,
        external_id: result.externalId,
        title: result.title,
        metadata: result.metadata,
        message_count: result.messageCount,
        token_count: result.tokenCount,
        total_cost_microdollars: result.totalCostMicrodollars,
        total_tokens: result.totalTokens,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      };
    },
  },
  {
    name: "recall_conversation",
    description: "Retrieve a conversation by its ID, including all stored messages.",
    requiredScope: "conversations:read",
    zodSchema: recallConversationSchema,
    inputSchema: jsonSchema(recallConversationSchema),
    handler: (c, args: z.infer<typeof recallConversationSchema>) => recallConversation(c, args.id),
  },
  {
    name: "list_conversations",
    description:
      "List conversations for the current project with optional pagination and filtering.",
    requiredScope: "conversations:read",
    zodSchema: listConversationsSchema,
    inputSchema: jsonSchema(listConversationsSchema),
    handler: async (c, args: z.infer<typeof listConversationsSchema>) => {
      const result = await conversationsService.listConversations(
        c.get("db"),
        c.env.AUTH_CACHE,
        c.get("projectId"),
        {
          limit: args.limit ?? 50,
          cursor: args.cursor,
          order: args.order ?? "desc",
          tag: args.tag,
        },
      );
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return {
        data: result.rows.map(deserializeConversationFull),
        pagination: {
          limit: result.rows.length,
          next_cursor: result.nextCursor,
          total: result.totalCount,
        },
      };
    },
  },

  // --- State ---
  {
    name: "upsert_state",
    description:
      "Write (create or overwrite) a state record at the given state_key. Optionally pass a lease_id for fenced writes.",
    requiredScope: "state:write",
    zodSchema: upsertStateSchema,
    inputSchema: jsonSchema(upsertStateSchema),
    handler: async (c, args: z.infer<typeof upsertStateSchema>) => {
      const { state_key, idempotency_key, ...input } = args;
      const result = await statesService.upsertState(
        c.get("d1Db"),
        c.get("projectId"),
        state_key,
        input,
        idempotency_key,
      );
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return result.result?.body;
    },
  },
  {
    name: "get_state",
    description:
      "Read the current state record at state_key. Optionally read at a historical sequence or timestamp.",
    requiredScope: "state:read",
    zodSchema: getStateSchema,
    inputSchema: jsonSchema(getStateSchema),
    handler: async (c, args: z.infer<typeof getStateSchema>) => {
      const state =
        args.at_sequence !== undefined || args.at_time !== undefined
          ? await statesService.getHistoricalState(
              c.get("d1Db"),
              c.get("projectId"),
              args.state_key,
              args.at_sequence,
              args.at_time,
            )
          : await statesService.getLatestState(c.get("d1Db"), c.get("projectId"), args.state_key);
      if (!state) throw new ToolError("NOT_FOUND", "State not found");
      return state;
    },
  },
  {
    name: "query_states",
    description:
      "Query state records across the project with flexible filters (agent, tags, JSON path, time range).",
    requiredScope: "state:read",
    zodSchema: queryStatesSchema,
    inputSchema: jsonSchema(queryStatesSchema),
    handler: async (c, args: z.infer<typeof queryStatesSchema>) => {
      const result = await statesService.queryStates(c.get("d1Db"), c.get("projectId"), args);
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return {
        data: result.rows ?? [],
        pagination: {
          limit: result.rows?.length ?? 0,
          next_cursor: result.nextCursor ?? null,
        },
      };
    },
  },

  // --- Leases ---
  {
    name: "acquire_lease",
    description:
      "Acquire a distributed lease on state_key. Returns a conflict if already held. Use the lease_id for fenced state writes.",
    requiredScope: "leases:write",
    zodSchema: acquireLeaseSchema,
    inputSchema: jsonSchema(acquireLeaseSchema),
    handler: async (c, args: z.infer<typeof acquireLeaseSchema>) => {
      const result = await leasesService.createLease(
        c.get("db"),
        c.get("projectId"),
        args.state_key,
        args.holder,
        args.ttl_ms,
      );
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return result.lease;
    },
  },
  {
    name: "renew_lease",
    description:
      "Renew an active lease before it expires. Must be called while the lease is still valid.",
    requiredScope: "leases:write",
    zodSchema: renewLeaseSchema,
    inputSchema: jsonSchema(renewLeaseSchema),
    handler: async (c, args: z.infer<typeof renewLeaseSchema>) => {
      const result = await leasesService.renewLease(
        c.get("db"),
        c.get("projectId"),
        args.lease_id,
        args.ttl_ms,
      );
      if (result.error) throw new ToolError(result.error.code, result.error.message);
      return result.lease;
    },
  },
  {
    name: "release_lease",
    description:
      "Release a held lease immediately, making the state key available to the next acquirer.",
    requiredScope: "leases:write",
    zodSchema: releaseLeaseSchema,
    inputSchema: jsonSchema(releaseLeaseSchema),
    handler: async (c, args: z.infer<typeof releaseLeaseSchema>) => {
      const error = await leasesService.releaseLease(
        c.get("db"),
        c.get("projectId"),
        args.lease_id,
      );
      if (error) throw new ToolError(error.code, error.message);
      return { released: true };
    },
  },

  // --- Claims ---
  {
    name: "create_claim",
    description:
      "Create a verifiable claim about a subject with attached evidence. Status starts as 'pending'; call verify_claim to evaluate it.",
    requiredScope: "claims:write",
    zodSchema: createClaimSchema,
    inputSchema: jsonSchema(createClaimSchema),
    handler: async (c, args: z.infer<typeof createClaimSchema>) => {
      return claimsService.createClaim(c.get("db"), {
        projectId: c.get("projectId"),
        subjectType: args.subject_type,
        subjectId: args.subject_id,
        statement: args.statement,
        evidence: args.evidence.map(mapClaimEvidence),
      });
    },
  },
  {
    name: "verify_claim",
    description:
      "Trigger a verification run for an existing claim. Re-evaluates all evidence items and returns 'verified' or 'failed' with per-item details.",
    requiredScope: "claims:write",
    zodSchema: verifyClaimSchema,
    inputSchema: jsonSchema(verifyClaimSchema),
    handler: async (c, args: z.infer<typeof verifyClaimSchema>) => {
      const run = await claimsService.verifyClaim(c.get("db"), c.get("projectId"), args.claim_id);
      if (!run) throw new ToolError("NOT_FOUND", "Claim not found");
      return run;
    },
  },

  // --- Capability tokens ---
  {
    name: "mint_capability_token",
    description:
      "Mint a scoped capability token for delegation to sub-agents. The raw token is shown once — store it before discarding the response.",
    requiredScope: "keys:write",
    zodSchema: mintCapabilityTokenSchema,
    inputSchema: jsonSchema(mintCapabilityTokenSchema),
    handler: async (c, args: z.infer<typeof mintCapabilityTokenSchema>) => {
      // Delegation: the caller may only mint a token whose scopes are a subset
      // of its own. The caller's scopes are in API form (mcpAuth normalizes
      // capability tokens to it), while the REQUESTED scopes are capability-token
      // form (lease:write/claim:write, singular), so map the request up to API
      // form before the subset check.
      const callerScopes = c.get("capabilityScopes") ?? [];
      const required = args.scopes.map(capabilityToApiScope);
      if (!scopesSatisfyAll(callerScopes, required)) {
        throw new ToolError("FORBIDDEN", "Cannot grant scopes beyond the calling key's own scopes");
      }
      return capabilityTokensService.createCapabilityToken(c.get("db"), c.get("projectId"), {
        name: args.name,
        scopes: args.scopes,
        expires_at: args.expires_at,
      });
    },
  },

  // --- API key management ---
  {
    name: "create_api_key",
    description:
      "Create a new API key for the current project. Requested scopes must be a subset of the caller's scopes; omit to inherit them. The raw key is shown once.",
    requiredScope: "keys:write",
    zodSchema: createApiKeySchema,
    inputSchema: jsonSchema(createApiKeySchema),
    handler: async (c, args: z.infer<typeof createApiKeySchema>) => {
      // Same delegation rule as routes/keys.ts: a key may only mint a child key
      // whose scopes are a subset of its own. Omitted scopes inherit the
      // caller's scopes (no escalation), except a full-access (`*`) caller
      // leaves scopes unset to produce a full-access child.
      const callerScopes = c.get("capabilityScopes") ?? [];
      const callerHasFullAccess = callerScopes.includes("*");
      let childScopes = args.scopes;
      if (childScopes) {
        if (!scopesSatisfyAll(callerScopes, childScopes)) {
          throw new ToolError(
            "FORBIDDEN",
            "Cannot grant scopes beyond the calling key's own scopes",
          );
        }
      } else if (!callerHasFullAccess) {
        childScopes = callerScopes;
      }
      const apiKey = await keysService.createApiKey(
        c.get("db"),
        c.get("projectId"),
        args.name,
        childScopes,
      );
      return {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        key: apiKey.key,
        scopes: apiKey.scopes,
        created_at: apiKey.created_at,
        last_used_at: apiKey.last_used_at,
        revoked_at: apiKey.revoked_at,
      };
    },
  },
  {
    name: "list_api_keys",
    description: "List API keys for the current project. Raw secrets are never returned.",
    requiredScope: "keys:read",
    zodSchema: listApiKeysSchema,
    inputSchema: jsonSchema(listApiKeysSchema),
    handler: async (c) => {
      const keys = await keysService.listApiKeys(c.get("db"), c.get("projectId"));
      return {
        data: keys.map((k) => ({
          id: k.id,
          name: k.name,
          key_prefix: k.key_prefix,
          scopes: k.scopes,
          created_at: k.created_at,
          last_used_at: k.last_used_at,
          revoked_at: k.revoked_at,
        })),
      };
    },
  },
  {
    name: "revoke_api_key",
    description: "Revoke an API key by ID, immediately invalidating it.",
    requiredScope: "keys:write",
    zodSchema: revokeApiKeySchema,
    inputSchema: jsonSchema(revokeApiKeySchema),
    handler: async (c, args: z.infer<typeof revokeApiKeySchema>) => {
      const revokedHash = await keysService.revokeApiKey(c.get("db"), c.get("projectId"), args.id);
      if (!revokedHash) throw new ToolError("NOT_FOUND", "API key not found");
      // Drop the auth-cache entry so the revoked key stops working immediately.
      const cache = c.env.AUTH_CACHE;
      if (cache) {
        c.executionCtx.waitUntil(cache.delete(`auth:hash:${revokedHash}`));
      }
      return { revoked: true, id: args.id };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a capability-token scope (e.g. "lease:write") to the API scope it
 * corresponds to (e.g. "leases:write") for the delegation subset check.
 */
function capabilityToApiScope(scope: string): string {
  if (scope === "lease:write") return "leases:write";
  if (scope === "claim:write") return "claims:write";
  return scope;
}

type ClaimEvidence = z.infer<typeof claimEvidenceSchema>;

function mapClaimEvidence(input: ClaimEvidence): claimsService.CreateEvidenceInput {
  if (input.kind === "text_hash") {
    return { kind: "text_hash", source: input.source, data: input.data, hash: input.hash };
  }
  if (input.kind === "json_value") {
    return {
      kind: "json_value",
      source: input.source,
      data: input.data,
      jsonPath: input.json_path,
      expectedValue: input.expected_value,
    };
  }
  return {
    kind: "state_event",
    source: input.source,
    hash: input.hash,
    jsonPath: input.json_path,
    expectedValue: input.expected_value,
  };
}
