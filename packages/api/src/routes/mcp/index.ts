import { Hono } from "hono";
import { scopeSatisfies } from "../../lib/scopes";
import { mcpAuth } from "../../middleware/mcp-auth";
import type { Bindings, Variables } from "../../types";
import { TOOLS, TOOLS_BY_NAME, type ToolContext, ToolError } from "./tools";

// ---------------------------------------------------------------------------
// Remote MCP server — stateless Streamable HTTP transport (MCP 2025-06-18).
//
// A single JSON-RPC message is POSTed per request; we dispatch by method and
// return the JSON-RPC response object. We do NOT maintain sessions
// (Mcp-Session-Id) or server-initiated SSE — every request carries its own
// auth and is fully self-contained.
// ---------------------------------------------------------------------------

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const PROTOCOL_VERSION = "2025-06-18";
// Protocol versions this server can speak. On initialize we echo the client's
// requested version only if it is one of these; otherwise we answer with our
// latest supported version, per the MCP spec.
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-06-18", "2025-03-26"]);
const SERVER_INFO = { name: "agentstate", version: "0.1.0" };

// Origins allowed to call the MCP endpoint cross-site. Mirrors the global CORS
// allowlist in index.ts; same-origin requests (no Origin header) always pass.
const ALLOWED_ORIGINS = new Set([
  "https://agentstate.app",
  "http://localhost:3000",
  "http://localhost:8787",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8787",
]);

// JSON-RPC error codes (subset of the spec we emit). Tool-level failures use a
// successful result with `isError: true`, so only these protocol-level codes
// are needed here.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

router.use("*", mcpAuth);

// Server-initiated SSE is not supported in stateless mode.
router.get("/", (c) =>
  c.json({ error: { code: "METHOD_NOT_ALLOWED", message: "GET not supported" } }, 405),
);

router.post("/", async (c) => {
  // Origin check (DNS-rebinding protection). Browsers always send Origin on
  // cross-site requests; non-browser MCP clients omit it. Reject a present
  // Origin that is not same-origin and not allowlisted.
  const origin = c.req.header("Origin");
  if (origin) {
    const sameOrigin = origin === new URL(c.req.url).origin;
    if (!sameOrigin && !ALLOWED_ORIGINS.has(origin)) {
      return c.json({ error: { code: "FORBIDDEN", message: "Origin not allowed" } }, 403);
    }
  }

  let message: JsonRpcRequest;
  try {
    message = (await c.req.json()) as JsonRpcRequest;
  } catch {
    return c.json(rpcError(null, PARSE_ERROR, "Parse error"), 200);
  }

  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return c.json(rpcError(null, INVALID_REQUEST, "Invalid Request"), 200);
  }

  // Notifications (and responses) carry no `id` — acknowledge with 202, no body.
  if (message.id === undefined || message.id === null) {
    return c.body(null, 202);
  }

  const id = message.id;
  const method = message.method;

  switch (method) {
    case "initialize": {
      const requested = message.params?.protocolVersion;
      const negotiated =
        typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.has(requested)
          ? requested
          : PROTOCOL_VERSION;
      return c.json(
        rpcResult(id, {
          protocolVersion: negotiated,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        }),
      );
    }

    case "ping":
      return c.json(rpcResult(id, {}));

    case "tools/list":
      return c.json(
        rpcResult(id, {
          tools: TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        }),
      );

    case "tools/call":
      return c.json(rpcResult(id, await callTool(c, message.params)));

    default:
      return c.json(rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method ?? "(none)"}`));
  }
});

/**
 * Run a tool call. Tool-level failures (unknown tool, missing scope, invalid
 * args, handler error) are returned as a successful JSON-RPC result with
 * `isError: true`, per the MCP spec — only protocol-level problems use
 * JSON-RPC errors.
 */
async function callTool(
  c: ToolContext,
  params: Record<string, unknown> | undefined,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const name = typeof params?.name === "string" ? params.name : "";
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) {
    return errorContent(`Unknown tool: ${name || "(none)"}`);
  }

  const granted = c.get("capabilityScopes") ?? [];
  if (!scopeSatisfies(granted, tool.requiredScope)) {
    return errorContent(`FORBIDDEN: missing required scope ${tool.requiredScope}`);
  }

  const parsed = tool.zodSchema.safeParse(params?.arguments ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return errorContent(
      `INVALID_PARAMS: ${path ? `${path}: ` : ""}${issue?.message ?? "invalid arguments"}`,
    );
  }

  try {
    const result = await tool.handler(c, parsed.data);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    if (err instanceof ToolError) {
      return errorContent(`Error: ${err.code}: ${err.message}`);
    }
    // Unexpected internal error: log it server-side (the global onError handler
    // is bypassed because we return a successful JSON-RPC result), and return a
    // generic message so internal details are not leaked to the client.
    console.error(
      JSON.stringify({
        level: "error",
        request_id: c.res.headers.get("X-Request-Id"),
        path: c.req.path,
        tool: name,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }),
    );
    return errorContent("Error: INTERNAL_ERROR: internal server error");
  }
}

function errorContent(text: string): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return { content: [{ type: "text", text }], isError: true };
}

export default router;
