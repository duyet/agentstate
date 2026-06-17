# Claims — Verifiable Agent Output with Evidence

Use claims when you need an agent to attach auditable, machine-checkable evidence to a piece of work: "this summary is faithful," "this API responded correctly," "this state event was recorded." Claims give you provenance you can verify on demand rather than trusting the agent's output blindly.

## Core flow

1. **Compute evidence** — hash the text you want to attest, snapshot a JSON value you want to assert, or reference a state event.
2. **Create the claim** — `POST /api/v1/claims` with the subject, statement, and evidence list. Returns a `Claim` in `pending` status.
3. **Verify** — `POST /api/v1/claims/:id/verify` re-computes or re-evaluates each evidence item. Returns `verified` or `failed` with per-item results.
4. **Audit** — `GET /api/v1/claims` or `GET /api/v1/claims/:id` to query the record at any time.

---

## curl examples

### Compute a SHA-256 hash (no trailing newline)

```bash
printf '%s' "The assistant accurately summarized the document." | shasum -a 256
# → 3b9f5a2e1c84d607a0f938b2e4c1dd9abf5c6e7d8a0b1c2d3e4f5a6b7c8d9e0f  -
```

### Create a claim with `text_hash` evidence

```bash
curl -s -X POST https://agentstate.app/api/v1/claims \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "conversation",
    "subject_id": "conv_MDEyMzQ1Njc4OTAxMjM0NQ",
    "statement": "The assistant accurately summarized the document.",
    "evidence": [
      {
        "kind": "text_hash",
        "source": "assistant-summary",
        "data": "The assistant accurately summarized the document.",
        "hash": "3b9f5a2e1c84d607a0f938b2e4c1dd9abf5c6e7d8a0b1c2d3e4f5a6b7c8d9e0f"
      }
    ]
  }'
```

**201 — claim created:**
```json
{
  "id": "ClaimABCDEFGHIJKLMNOPQR",
  "project_id": "proj_xyz",
  "subject_type": "conversation",
  "subject_id": "conv_MDEyMzQ1Njc4OTAxMjM0NQ",
  "statement": "The assistant accurately summarized the document.",
  "status": "pending",
  "created_at": 1718700000000,
  "updated_at": 1718700000000
}
```

### Create a claim with `json_value` evidence

```bash
curl -s -X POST https://agentstate.app/api/v1/claims \
  -H "Authorization: Bearer as_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "api-call",
    "subject_id": "run-2024-06-18-001",
    "statement": "The upstream API returned status ok.",
    "evidence": [
      {
        "kind": "json_value",
        "source": "api-response",
        "data": {"status": "ok", "items": 42},
        "json_path": "$.status",
        "expected_value": "ok"
      }
    ]
  }'
```

### Verify a claim

```bash
curl -s -X POST https://agentstate.app/api/v1/claims/ClaimABCDEFGHIJKLMNOPQR/verify \
  -H "Authorization: Bearer as_live_..."
```

**201 — verification run (all pass):**
```json
{
  "id": "RunXYZABCDEFGHIJKLMNOP",
  "claim_id": "ClaimABCDEFGHIJKLMNOPQR",
  "status": "verified",
  "details": {
    "results": [
      {
        "evidence_id": "EvABCDEFGHIJKLMNOPQRST",
        "kind": "text_hash",
        "source": "assistant-summary",
        "passed": true,
        "message": "SHA-256 hash matched"
      }
    ]
  },
  "created_at": 1718700060000
}
```

**201 — verification run (failure):**
```json
{
  "id": "RunXYZABCDEFGHIJKLMNOP",
  "claim_id": "ClaimABCDEFGHIJKLMNOPQR",
  "status": "failed",
  "details": {
    "results": [
      {
        "evidence_id": "EvABCDEFGHIJKLMNOPQRST",
        "kind": "text_hash",
        "source": "assistant-summary",
        "passed": false,
        "message": "SHA-256 hash mismatch"
      }
    ]
  },
  "created_at": 1718700060000
}
```

### List claims for a subject

```bash
curl -s "https://agentstate.app/api/v1/claims?subject_type=conversation&subject_id=conv_MDEyMzQ1Njc4OTAxMjM0NQ&limit=20" \
  -H "Authorization: Bearer as_live_..."
```

---

## TypeScript SDK

```typescript
import { AgentState } from "@agentstate/sdk";
import { createHash } from "node:crypto";

const client = new AgentState({ apiKey: "as_live_..." });

async function attestSummary(conversationId: string, summaryText: string) {
  // Compute the hash — no trailing newline
  const hash = createHash("sha256").update(summaryText, "utf8").digest("hex");

  // Create the claim
  const claim = await client.createClaim({
    subject_type: "conversation",
    subject_id: conversationId,
    statement: "The assistant summary is faithful to the source document.",
    evidence: [
      {
        kind: "text_hash",
        source: "assistant-summary",
        data: summaryText,
        hash,
      },
    ],
  });

  console.log(`Claim created: ${claim.id} (status=${claim.status})`);

  // Verify immediately (or defer and verify later)
  const run = await client.verifyClaim(claim.id);
  console.log(`Verification: ${run.status}`);
  for (const result of run.details.results) {
    console.log(`  ${result.source}: ${result.passed ? "PASS" : "FAIL"} — ${result.message}`);
  }

  return run;
}

// Attest an API response field
async function attestApiResponse(runId: string, apiResponse: Record<string, unknown>) {
  const claim = await client.createClaim({
    subject_type: "api-call",
    subject_id: runId,
    statement: "The upstream API returned status ok.",
    evidence: [
      {
        kind: "json_value",
        source: "api-response",
        data: apiResponse,
        json_path: "$.status",
        expected_value: "ok",
      },
    ],
  });

  return client.verifyClaim(claim.id);
}

// List claims for audit
async function auditConversation(conversationId: string) {
  const result = await client.listClaims({
    subject_type: "conversation",
    subject_id: conversationId,
    limit: 50,
    order: "desc",
  });

  for (const claim of result.data) {
    console.log(`${claim.id}  ${claim.status}  "${claim.statement}"`);
  }
}
```

---

## Python SDK

```python
import hashlib
from agentstate import AgentStateClient

client = AgentStateClient(api_key="as_live_...")

def attest_summary(conversation_id: str, summary_text: str):
    # Compute SHA-256 — encode without trailing newline
    sha256 = hashlib.sha256(summary_text.encode("utf-8")).hexdigest()

    # Create the claim
    claim = client.create_claim(
        subject_type="conversation",
        subject_id=conversation_id,
        statement="The assistant summary is faithful to the source document.",
        evidence=[
            {
                "kind": "text_hash",
                "source": "assistant-summary",
                "data": summary_text,
                "hash": sha256,
            }
        ],
    )
    print(f"Claim created: {claim['id']} (status={claim['status']})")

    # Verify
    run = client.verify_claim(claim["id"])
    print(f"Verification: {run['status']}")
    for result in run["details"]["results"]:
        flag = "PASS" if result["passed"] else "FAIL"
        print(f"  {result['source']}: {flag} — {result['message']}")
    return run

def attest_api_response(run_id: str, api_response: dict):
    claim = client.create_claim(
        subject_type="api-call",
        subject_id=run_id,
        statement="The upstream API returned status ok.",
        evidence=[
            {
                "kind": "json_value",
                "source": "api-response",
                "data": api_response,
                "json_path": "$.status",
                "expected_value": "ok",
            }
        ],
    )
    return client.verify_claim(claim["id"])

def audit_conversation(conversation_id: str):
    result = client.list_claims(
        subject_type="conversation",
        subject_id=conversation_id,
        limit=50,
        order="desc",
    )
    for claim in result["data"]:
        print(f"{claim['id']}  {claim['status']}  \"{claim['statement']}\"")
```

---

## Key concepts

### Three evidence kinds

| Kind | What it checks | When to use |
|------|---------------|-------------|
| `text_hash` | Re-computes SHA-256 of `data` and compares to `hash` | Attest that a string (prompt, summary, output) has not been tampered with |
| `json_value` | Evaluates `json_path` against `data` and compares to `expected_value` | Assert that a JSON response or state snapshot contains an expected value |
| `state_event` | Ties the claim to a recorded state event, optionally checking a hash or JSON field | Link a claim to a prior state write in the same project |

#### `text_hash` — computing the hash correctly

Use `printf '%s'` (not `echo`) to avoid adding a trailing newline, which would change the digest:

```bash
printf '%s' "your text here" | shasum -a 256
```

In Node.js: `createHash("sha256").update(text, "utf8").digest("hex")`

In Python: `hashlib.sha256(text.encode("utf-8")).hexdigest()`

The `hash` field must be exactly 64 lowercase hexadecimal characters.

#### `json_value` — JSON path syntax

`json_path` uses simple dot notation: `$.field`, `$.nested.field`, `$.array[0]`. Verification evaluates the path against `data` and compares the result to `expected_value` using strict equality.

#### `state_event` — tying claims to state history

Provide `hash` to verify a recorded state event's content hash, or provide `json_path` + `expected_value` to assert a value within that event's data. You must supply at least one of the two.

### What verify recomputes

`POST /api/v1/claims/:id/verify` runs a fresh verification pass against the stored evidence. For `text_hash`, it re-hashes `data` and compares. For `json_value`, it re-evaluates the path. The result is a `ClaimVerificationRun` with `status: "verified"` (all items passed) or `status: "failed"` (at least one item failed), and per-item `passed`/`message` details.

### Why this gives provenance

Claims are immutable once created. The evidence is stored alongside the claim. At any future point — hours, days, or iterations later — you can verify whether the stated conditions were true at claim-creation time. This gives your agent fleet an auditable evidence trail without building a custom logging system.

---

[Get a free API key at agentstate.app](https://agentstate.app) or see [getting-started.md](../getting-started.md) for a two-minute setup guide.
