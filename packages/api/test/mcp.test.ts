import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, authHeaders, seedProject, TEST_API_KEY } from "./setup";

// ---------------------------------------------------------------------------
// Remote MCP server (POST /api/mcp) — stateless Streamable HTTP
// ---------------------------------------------------------------------------

const MCP_URL = "http://localhost/api/mcp";
const TEST_KEY = TEST_API_KEY;

function bearer(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
}

async function rpc(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<{ status: number; json: any }> {
  const res = await SELF.fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

/** Create a scoped key via the keyless /api/v1/keys route. */
async function createScopedKey(scopes: string[]): Promise<string> {
  const res = await SELF.fetch("http://localhost/api/v1/keys", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: "scoped-mcp", scopes }),
  });
  expect(res.status).toBe(201);
  const body = (await res.json()) as { key: string };
  return body.key;
}

describe("remote MCP server", () => {
  beforeEach(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("initialize returns serverInfo and protocol version", async () => {
    const { status, json } = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18" },
    });
    expect(status).toBe(200);
    expect(json.result.serverInfo).toEqual({ name: "agentstate", version: "0.1.0" });
    expect(json.result.protocolVersion).toBe("2025-06-18");
    expect(json.result.capabilities).toHaveProperty("tools");
  });

  it("notifications/initialized returns 202 with no body", async () => {
    const res = await SELF.fetch(MCP_URL, {
      method: "POST",
      headers: bearer(TEST_KEY),
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("tools/list lists all tools with input schemas", async () => {
    const { status, json } = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(status).toBe(200);
    const names = json.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("store_conversation");
    expect(names).toContain("list_conversations");
    expect(names).toContain("upsert_state");
    expect(names).toContain("acquire_lease");
    expect(names).toContain("create_claim");
    expect(names).toContain("mint_capability_token");
    expect(names).toContain("create_api_key");
    expect(names).toContain("list_api_keys");
    expect(names).toContain("revoke_api_key");
    // Every tool advertises a JSON Schema object.
    for (const tool of json.result.tools) {
      expect(tool.inputSchema).toBeTypeOf("object");
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("tools/call list_conversations returns data", async () => {
    const { status, json } = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_conversations", arguments: {} },
    });
    expect(status).toBe(200);
    expect(json.result.isError).toBeUndefined();
    const payload = JSON.parse(json.result.content[0].text);
    expect(payload).toHaveProperty("data");
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it("tools/call store_conversation then recall round-trips", async () => {
    const store = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "store_conversation",
        arguments: { title: "hi", messages: [{ role: "user", content: "hello" }] },
      },
    });
    expect(store.json.result.isError).toBeUndefined();
    const created = JSON.parse(store.json.result.content[0].text);
    expect(created.id).toBeTruthy();
    expect(created.message_count).toBe(1);

    const recall = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "recall_conversation", arguments: { id: created.id } },
    });
    const fetched = JSON.parse(recall.json.result.content[0].text);
    expect(fetched.id).toBe(created.id);
    expect(fetched.messages).toHaveLength(1);
    expect(fetched.messages[0].content).toBe("hello");
  });

  it("a scoped key calling an out-of-scope tool returns isError", async () => {
    const readOnly = await createScopedKey(["conversations:read"]);
    const { status, json } = await rpc(bearer(readOnly), {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "upsert_state",
        arguments: { state_key: "k", agent_id: "a", data: { x: 1 } },
      },
    });
    // Tool-level authorization failures are a successful JSON-RPC result.
    expect(status).toBe(200);
    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("FORBIDDEN");
  });

  it("a scoped key can call an in-scope tool", async () => {
    const readOnly = await createScopedKey(["conversations:read"]);
    const { json } = await rpc(bearer(readOnly), {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "list_conversations", arguments: {} },
    });
    expect(json.result.isError).toBeUndefined();
  });

  it("a capability token with lease:write can call acquire_lease (scope-form normalization)", async () => {
    // Mint a capability token scoped to the singular capability form.
    const mint = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 20,
      method: "tools/call",
      params: {
        name: "mint_capability_token",
        arguments: { name: "sub", scopes: ["lease:write"] },
      },
    });
    expect(mint.json.result.isError).toBeUndefined();
    const token = JSON.parse(mint.json.result.content[0].text).token as string;
    expect(token.startsWith("as_cap_")).toBe(true);

    // The token's singular lease:write must satisfy the lease tool's plural
    // leases:write requiredScope, or capability-token delegation is broken.
    const acquire = await rpc(bearer(token), {
      jsonrpc: "2.0",
      id: 21,
      method: "tools/call",
      params: {
        name: "acquire_lease",
        arguments: { state_key: "task:1", holder: "sub" },
      },
    });
    expect(acquire.json.result.isError).toBeUndefined();
    const lease = JSON.parse(acquire.json.result.content[0].text);
    expect(lease.id).toBeTruthy();
    expect(lease.state_key).toBe("task:1");

    // But it must NOT be able to write conversations (scope it never had).
    const store = await rpc(bearer(token), {
      jsonrpc: "2.0",
      id: 22,
      method: "tools/call",
      params: { name: "store_conversation", arguments: { title: "nope" } },
    });
    expect(store.json.result.isError).toBe(true);
    expect(store.json.result.content[0].text).toContain("FORBIDDEN");
  });

  it("initialize answers with a supported version for an unsupported request", async () => {
    const { json } = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 23,
      method: "initialize",
      params: { protocolVersion: "1999-01-01" },
    });
    expect(json.result.protocolVersion).toBe("2025-06-18");
  });

  it("unknown method returns JSON-RPC -32601", async () => {
    const { json } = await rpc(bearer(TEST_KEY), {
      jsonrpc: "2.0",
      id: 8,
      method: "does/not/exist",
    });
    expect(json.error.code).toBe(-32601);
  });

  it("no Authorization returns 401 with WWW-Authenticate header", async () => {
    const res = await SELF.fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "initialize", params: {} }),
    });
    expect(res.status).toBe(401);
    const challenge = res.headers.get("WWW-Authenticate");
    expect(challenge).toContain("Bearer");
    expect(challenge).toContain("resource_metadata=");
    expect(challenge).toContain("/.well-known/oauth-protected-resource");
  });

  it("GET /api/mcp returns 405", async () => {
    const res = await SELF.fetch(MCP_URL, { method: "GET", headers: bearer(TEST_KEY) });
    expect(res.status).toBe(405);
  });
});
