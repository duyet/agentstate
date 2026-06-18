# Verifiable agent output with claims and evidence

_Published 2026-06-18_

---

In a multi-agent pipeline, one agent's output is another agent's input. That sounds fine until you ask: how does the consumer know the producer actually did what it says it did?

Assertion is not proof. An agent can write `"status": "summarized"` to a state key whether or not it produced a faithful summary. It can report `"api_ok": true` even if the upstream API returned a 500 that the agent silently swallowed. In a pipeline of N agents, each asserting their output is correct, errors compound invisibly.

AgentState's **claims** primitive gives agents a way to file verifiable evidence alongside their output — and gives any downstream agent or audit process a way to check that evidence on demand.

---

## The problem: assertion without provenance

Consider a three-stage summarization pipeline:

```
fetcher-agent  →  summarizer-agent  →  reviewer-agent
```

The summarizer writes a conversation turn and sets a state key:

```
state: pipeline:doc-001  →  {"stage": "summarized", "summary_conv": "conv_abc"}
```

The reviewer reads this and proceeds. But it has no way to verify:

- That the summary in `conv_abc` was actually derived from the fetched document.
- That the summary text has not been modified since the summarizer wrote it.
- That the summarizer ran successfully rather than silently writing stale content.

With claims, the summarizer files evidence at the time it produces its output. The reviewer — or any future audit — can re-run verification against that evidence and confirm the output is still intact.

---

## The core flow

1. **Compute evidence** — hash the output text you want to attest, or identify a JSON field in a response you want to assert.
2. **Create the claim** — `POST /api/v1/claims` with the subject, statement, and evidence list. Returns a `Claim` with `status: "pending"`.
3. **Verify** — `POST /api/v1/claims/:id/verify` re-computes or re-evaluates each evidence item. Returns a `ClaimVerificationRun` with `status: "verified"` or `"failed"`.
4. **Audit** — `GET /api/v1/claims` or `GET /api/v1/claims/:id` to query the record at any time.

---

## Worked example: attesting a summary

### Step 1 — Compute the hash

The summarizer has just written a summary. Before it moves on, it hashes the text it wants to attest. Use `printf '%s'` (not `echo`) to avoid a trailing newline that would change the digest:

```bash
printf '%s' "The document discusses three approaches to distributed locking." | shasum -a 256
# → a7f3c2e1d984b607a0f938b2e4c1dd9abf5c6e7d8a0b1c2d3e4f5a6b7c8d9e0f  -
```

### Step 2 — Create the claim

```bash
curl -s -X POST https://agentstate.app/api/v1/claims \
  -H "Authorization: Bearer $AGENTSTATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "conversation",
    "subject_id": "conv_MDEyMzQ1Njc4OTAxMjM0NQ",
    "statement": "The assistant accurately summarized the document.",
    "evidence": [
      {
        "kind": "text_hash",
        "source": "assistant-summary",
        "data": "The document discusses three approaches to distributed locking.",
        "hash": "a7f3c2e1d984b607a0f938b2e4c1dd9abf5c6e7d8a0b1c2d3e4f5a6b7c8d9e0f"
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

The claim is `pending` — it exists but has not been verified yet. The summarizer records the claim ID and passes it downstream (via state, or as part of its output message).

### Step 3 — Verify

The reviewer agent (or a separate auditor) calls verify:

```bash
curl -s -X POST https://agentstate.app/api/v1/claims/ClaimABCDEFGHIJKLMNOPQR/verify \
  -H "Authorization: Bearer $AGENTSTATE_KEY"
```

**201 — verification passed:**

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

`status: "verified"` means every evidence item passed. If even one item fails, the run returns `status: "failed"` with per-item `passed: false` and a message explaining why — for example, `"SHA-256 hash mismatch"`. The reviewer can act on `"failed"` the same way it would act on any other error: halt the pipeline, flag the conversation for human review, or retry with a fresh summarizer call.

---

## What verify actually recomputes

Verification is not a replay of the original claim. It is a fresh evaluation of the stored evidence against the stored data:

- **`text_hash`** — re-hashes the `data` field with SHA-256 and compares the result to `hash`. If the text was modified after claim creation, the digest no longer matches.
- **`json_value`** — evaluates `json_path` against `data` using simple dot notation (`$.status`, `$.nested.field`, `$.array[0]`) and compares the result to `expected_value` with strict equality.
- **`state_event`** — ties the claim to a recorded state event, optionally checking a hash or a JSON field within that event's data.

Because the evidence is stored alongside the claim, you can verify hours or iterations later and still get a meaningful result. The claim record is immutable once created.

---

## Attesting an API response field

Not all evidence is a text hash. When an agent calls an external API, it can attest that the response contained an expected value — useful when downstream logic depends on a specific field:

```bash
curl -s -X POST https://agentstate.app/api/v1/claims \
  -H "Authorization: Bearer $AGENTSTATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "api-call",
    "subject_id": "run-2026-06-18-001",
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

When verify runs, it evaluates `$.status` against the stored `data` object and checks it equals `"ok"`. A downstream agent that reads this claim and sees `"verified"` knows the API responded correctly at the time the claim was filed — not just that the producer agent said so.

---

## TypeScript SDK

The SDK keeps the same flow — hash, create, verify — in a single async function:

```typescript
import { AgentState } from "@agentstate/sdk";
import { createHash } from "node:crypto";

const client = new AgentState({ apiKey: process.env.AGENTSTATE_API_KEY! });

async function attestAndVerify(
  conversationId: string,
  summaryText: string,
): Promise<void> {
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

  // Verify — immediately or deferred
  const run = await client.verifyClaim(claim.id);
  console.log(`Verification: ${run.status}`);

  for (const result of run.details.results) {
    const flag = result.passed ? "PASS" : "FAIL";
    console.log(`  ${result.source}: ${flag} — ${result.message}`);
  }

  if (run.status === "failed") {
    throw new Error(`Claim ${claim.id} failed verification — halting pipeline`);
  }
}
```

The reviewer agent calls this on the claim ID it received from the summarizer. If verification fails, the pipeline stops rather than propagating a bad summary silently.

---

## Auditing a subject's full history

Claims accumulate over the life of a conversation or pipeline run. `GET /api/v1/claims` lets you filter by subject:

```bash
curl -s "https://agentstate.app/api/v1/claims?subject_type=conversation&subject_id=conv_MDEyMzQ1Njc4OTAxMjM0NQ&limit=20" \
  -H "Authorization: Bearer $AGENTSTATE_KEY"
```

Every claim that was ever filed against this conversation comes back — who filed it, what was asserted, and whether the last verify run passed or failed. This is the audit trail that tells you not just what the pipeline produced, but what each stage proved about its own output.

---

## When to file a claim

A useful rule of thumb: file a claim whenever one agent produces output that another agent must trust.

| Scenario | Evidence kind | What it proves |
|----------|---------------|----------------|
| Summarizer attests its summary text | `text_hash` | Output has not been modified since the summarizer wrote it |
| API-caller attests an upstream response | `json_value` | A specific field in the response had the expected value |
| Writer attests a state event it recorded | `state_event` | A specific state write happened and had expected content |

You do not need claims for every write — only for the ones where a downstream agent or human review needs a way to check. Start with the pipeline boundaries: wherever one agent hands off to another is where provenance matters most.

---

## Get started

A free API key gives you access to all five primitives — claims, leases, capability tokens, states, and conversations.

**[Get your free key at agentstate.app](https://agentstate.app)**

```bash
npm install @agentstate/sdk
# or: pip install agentstate
```

See [getting-started.md](../getting-started.md) for a two-minute setup guide, and [recipes/claims.md](../recipes/claims.md) for the full reference including Python SDK examples and all three evidence kinds.
