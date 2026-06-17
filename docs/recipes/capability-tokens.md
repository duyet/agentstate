# Capability Tokens — Scoped Sub-Agent Delegation

Use capability tokens when you want to hand a sub-agent (or any untrusted process) the minimum permissions it needs — nothing more. You mint a short-lived, scope-restricted token from your project API key and pass it to the sub-agent instead of the raw key. If the token is leaked or the sub-agent misbehaves, revoke it without rotating your project credentials.

## Core flow

1. **Mint** — call `POST /api/v1/capability-tokens` with your project API key. Specify a name, the allowed scopes, and an optional expiry. The raw `token` value is returned **once and never again** — store it securely before discarding the response.
2. **Delegate** — pass the `as_cap_...` token to the sub-agent in place of the API key. The sub-agent uses it in the same `Authorization: Bearer` header.
3. **Sub-agent calls scoped routes** — requests that match the token's scopes proceed normally. Requests outside the scopes receive HTTP 403.
4. **Revoke when done** — call `DELETE /api/v1/capability-tokens/:id` to invalidate the token immediately.

---

## curl examples

### Mint a token with `claim:write` only

```bash
curl -s -X POST https://agentstate.app/api/v1/capability-tokens \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "summarizer-subagent",
    "scopes": ["claim:write"],
    "expires_at": 1718786400000
  }'
```

**201 — token minted (save `token` now — it will not be shown again):**
```json
{
  "id": "CapTokABCDEFGHIJKLMNOPQ",
  "name": "summarizer-subagent",
  "scopes": ["claim:write"],
  "token": "as_cap_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_prefix": "as_cap_xx",
  "expires_at": 1718786400000,
  "created_at": 1718700000000,
  "revoked_at": null
}
```

> **The `token` field is shown exactly once.** Only a SHA-256 hash is stored server-side. If you lose the token, revoke it and mint a new one.

### Sub-agent creates a claim (within scope — 201)

```bash
curl -s -X POST https://agentstate.app/api/v1/claims \
  -H "Authorization: Bearer as_cap_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "conversation",
    "subject_id": "conv_abc",
    "statement": "Summary verified by summarizer agent.",
    "evidence": [
      {
        "kind": "text_hash",
        "source": "summary",
        "data": "The meeting was about Q3 planning.",
        "hash": "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890"
      }
    ]
  }'
# → 201 Created
```

### Sub-agent tries to write state (out of scope — 403)

```bash
curl -s -X PUT https://agentstate.app/api/v1/states/some-key \
  -H "Authorization: Bearer as_cap_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "subagent", "data": {}}'
```

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Capability token does not have required scope"
  }
}
```

The token has `claim:write` only. Writing state requires `state:write` — so it is rejected with 403. The `as_live_` project key is never exposed to the sub-agent.

### List tokens

```bash
curl -s https://agentstate.app/api/v1/capability-tokens \
  -H "Authorization: Bearer as_live_..."
```

### Revoke a token

```bash
curl -s -X DELETE https://agentstate.app/api/v1/capability-tokens/CapTokABCDEFGHIJKLMNOPQ \
  -H "Authorization: Bearer as_live_..."
# → 204 No Content
```

---

## TypeScript SDK

```typescript
import { AgentState } from "@agentstate/sdk";

const orchestrator = new AgentState({ apiKey: "as_live_..." });

async function runSummarizerSubagent(conversationId: string) {
  // Mint a scoped token valid for 1 hour
  const tokenRecord = await orchestrator.createCapabilityToken({
    name: "summarizer-subagent",
    scopes: ["claim:write"],
    expires_at: Date.now() + 60 * 60 * 1000,
  });

  // tokenRecord.token is "as_cap_..." — shown once
  console.log(`Minted token: ${tokenRecord.id} (${tokenRecord.scopes.join(", ")})`);

  try {
    // Pass only the capability token to the sub-agent, never the project key
    await runSubagent(tokenRecord.token, conversationId);
  } finally {
    // Revoke when done, even if the sub-agent errored
    await orchestrator.revokeCapabilityToken(tokenRecord.id);
    console.log(`Revoked token: ${tokenRecord.id}`);
  }
}

async function runSubagent(capToken: string, conversationId: string) {
  // Sub-agent uses the scoped token — it can only write claims
  const subClient = new AgentState({ apiKey: capToken });

  const claim = await subClient.createClaim({
    subject_type: "conversation",
    subject_id: conversationId,
    statement: "Summary is faithful to the source document.",
    evidence: [
      {
        kind: "text_hash",
        source: "summary",
        data: "The meeting was about Q3 planning.",
        hash: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
      },
    ],
  });

  console.log(`Sub-agent filed claim: ${claim.id}`);
}

// List active tokens
async function showTokens() {
  const { data } = await orchestrator.listCapabilityTokens();
  for (const t of data) {
    const expiry = t.expires_at ? new Date(t.expires_at).toISOString() : "never";
    console.log(`${t.id}  ${t.name}  scopes=${t.scopes.join(",")}  expires=${expiry}`);
  }
}
```

---

## Python SDK

```python
import time
from agentstate import AgentStateClient

orchestrator = AgentStateClient(api_key="as_live_...")

def run_summarizer_subagent(conversation_id: str):
    # Mint a scoped token valid for 1 hour
    token_record = orchestrator.create_capability_token(
        name="summarizer-subagent",
        scopes=["claim:write"],
        expires_at=int(time.time() * 1000) + 60 * 60 * 1000,
    )

    # token_record["token"] is "as_cap_..." — shown once
    print(f"Minted token: {token_record['id']} ({', '.join(token_record['scopes'])})")

    try:
        # Pass only the capability token to the sub-agent, never the project key
        run_subagent(token_record["token"], conversation_id)
    finally:
        # Revoke when done, even if the sub-agent errored
        orchestrator.revoke_capability_token(token_record["id"])
        print(f"Revoked token: {token_record['id']}")

def run_subagent(cap_token: str, conversation_id: str):
    # Sub-agent uses the scoped token — it can only write claims
    sub_client = AgentStateClient(api_key=cap_token)

    claim = sub_client.create_claim(
        subject_type="conversation",
        subject_id=conversation_id,
        statement="Summary is faithful to the source document.",
        evidence=[
            {
                "kind": "text_hash",
                "source": "summary",
                "data": "The meeting was about Q3 planning.",
                "hash": "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
            }
        ],
    )
    print(f"Sub-agent filed claim: {claim['id']}")

def show_tokens():
    result = orchestrator.list_capability_tokens()
    for t in result["data"]:
        expiry = t["expires_at"] or "never"
        print(f"{t['id']}  {t['name']}  scopes={','.join(t['scopes'])}  expires={expiry}")
```

---

## Key concepts

### Least-privilege delegation

A project API key (`as_live_...`) has implicit full access to every route. A capability token is restricted to exactly the scopes listed at mint time. Give sub-agents only what they need:

- A summarizer that files claims → `["claim:write"]`
- A monitor that reads state → `["state:read", "state:watch"]`
- A worker that acquires leases and writes state → `["lease:write", "state:write"]`

Out-of-scope calls return HTTP 403 immediately, regardless of what the sub-agent attempts.

### Allowed scopes (exhaustive)

| Scope | What it permits |
|-------|----------------|
| `state:read` | Read state records and state event history |
| `state:write` | Upsert and delete state records |
| `state:watch` | Subscribe to the SSE state event stream |
| `lease:write` | Acquire, renew, and release leases |
| `claim:write` | Create claims, trigger verification, and read claim results |

### The `token` is shown once

The raw `as_cap_...` token appears in the mint response body and is never stored in plaintext — only a SHA-256 hash is kept server-side. If you lose the token, revoke the record and mint a new one. Treat it like a password.

### Expiry vs. revocation

Set `expires_at` (Unix milliseconds) for time-bounded delegation — for example, a per-run token that expires when the job is done. Call `DELETE /api/v1/capability-tokens/:id` for immediate revocation at any time, regardless of `expires_at`. Both strategies invalidate the token; revocation takes effect synchronously.

### Using a capability token in the SDK

Both the TypeScript and Python SDKs accept an `as_cap_...` token in the same `apiKey` / `api_key` constructor parameter. The sub-agent code is identical to orchestrator code — only the key changes.

---

[Get a free API key at agentstate.app](https://agentstate.app) or see [getting-started.md](../getting-started.md) for a two-minute setup guide.
