# Batch AI Operations Research

Research document for combining `generateTitle()` and `generateFollowUps()` into a single AI call.

## 1. Cost Analysis

### Current State (2 Separate Calls)

| Metric | Title Generation | Follow-ups Generation | Total |
|--------|------------------|----------------------|-------|
| AI Calls | 1 | 1 | **2** |
| Context Messages | First 10 | Last 20 | 30 max |
| System Prompt | ~25 tokens | ~30 tokens | ~55 tokens |
| Input Tokens | ~500 avg | ~800 avg | ~1300 avg |
| Output Tokens | ~10 | ~100 | ~110 |

### Batched State (1 Combined Call)

| Metric | Combined Generation | Savings |
|--------|--------------------|---------|
| AI Calls | **1** | **50%** |
| Context Messages | 20 (merged) | ~33% reduction |
| System Prompt | ~50 tokens | Single prompt overhead |
| Input Tokens | ~800 avg | ~38% reduction |
| Output Tokens | ~110 | Same |

### Estimated Savings
- **50% fewer API calls** → Reduced latency, lower rate limit pressure
- **~30% fewer input tokens** → Context shared, not duplicated
- **Cost reduction**: ~40% overall (rough estimate, depends on token pricing)

---

## 2. Technical Approaches

### Approach A: Structured Output with JSON

Use a single prompt that requests JSON output with both title and follow-ups.

**Pros:**
- Clean parsing with `JSON.parse()`
- Type-safe response handling
- Easy to extend with more fields later

**Cons:**
- LLM may produce malformed JSON
- Requires validation layer

### Approach B: Delimiter-Based Parsing

Use clear delimiters to separate title and follow-ups in plain text.

**Pros:**
- More resilient to LLM output variations
- No JSON parsing errors

**Cons:**
- Less structured, harder to extend
- Parsing edge cases (delimiters in content)

### Recommendation: **Approach A (JSON)**

With modern instruction-following models like Llama 3.1, JSON output is reliable when prompted correctly. Add a retry with delimiter fallback if JSON fails.

---

## 3. Implementation Plan

### New Function: `generateTitleAndFollowUps()`

```typescript
// src/services/ai.ts

export interface TitleAndFollowUps {
  title: string;
  followUps: string[];
}

export async function generateTitleAndFollowUps(
  ai: Ai,
  messages: Message[]
): Promise<TitleAndFollowUps> {
  // Implementation (see Section 4)
}
```

### Backward Compatibility

1. **Keep existing functions**: `generateTitle()` and `generateFollowUps()` remain available
2. **Add new function**: `generateTitleAndFollowUps()` as preferred method
3. **Update route handlers**: Use new function where both are needed
4. **Deprecation path**: Add optional `batch` param to routes, default to `true`

### Error Handling

```typescript
// Partial failure handling
interface BatchResult {
  title: string | null;      // null if title generation failed
  followUps: string[];        // empty array if follow-ups failed
  errors: {
    title?: string;
    followUps?: string;
  };
}
```

### Migration Path

1. **Phase 1**: Add new function, keep existing (backward compatible)
2. **Phase 2**: Add `/conversations/:id/generate-all` route using batch
3. **Phase 3**: Update dashboard to use batch endpoint
4. **Phase 4**: Deprecate separate endpoints (optional, keep for flexibility)

---

## 4. Code Example

### Combined Prompt

```typescript
const BATCH_SYSTEM_PROMPT = `You are a helpful assistant that analyzes conversations.

Analyze the conversation and provide:
1. A brief title (max 6 words) summarizing the conversation
2. Exactly 3 follow-up questions the user might ask next

Respond ONLY with valid JSON in this exact format:
{
  "title": "Your brief title here",
  "followUps": [
    "First follow-up question?",
    "Second follow-up question?",
    "Third follow-up question?"
  ]
}

Do not include any text before or after the JSON.`;
```

### Full Implementation

```typescript
export async function generateTitleAndFollowUps(
  ai: Ai,
  messages: Message[]
): Promise<TitleAndFollowUps> {
  // Use up to 20 messages (balance between title context and follow-up relevance)
  const contextMessages = messages.slice(-20);

  let result: unknown;
  try {
    result = await ai.run(MODEL, {
      messages: [
        { role: "system", content: BATCH_SYSTEM_PROMPT },
        ...contextMessages,
        { role: "user", content: "Analyze this conversation and provide the title and follow-ups." },
      ],
    });
  } catch (err) {
    console.error("[ai] generateTitleAndFollowUps failed:", err);
    return { title: "Untitled conversation", followUps: [] };
  }

  const raw =
    typeof result === "object" && result !== null && "response" in result
      ? String((result as { response: unknown }).response ?? "")
      : String(result ?? "");

  // Try JSON parsing first
  try {
    const parsed = JSON.parse(raw.trim());

    // Validate structure
    const title = typeof parsed.title === "string"
      ? parsed.title.trim().slice(0, 60) || "Untitled conversation"
      : "Untitled conversation";

    const followUps = Array.isArray(parsed.followUps)
      ? parsed.followUps
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 3)
      : [];

    return { title, followUps };
  } catch (parseErr) {
    // Fallback: try delimiter-based parsing
    console.warn("[ai] JSON parse failed, using delimiter fallback");
    return parseWithDelimiters(raw);
  }
}

// Fallback parser for non-JSON responses
function parseWithDelimiters(raw: string): TitleAndFollowUps {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // Try to extract title from first line
  let title = "Untitled conversation";
  const followUps: string[] = [];

  for (const line of lines) {
    // Look for title pattern
    if (line.toLowerCase().startsWith("title:") || line.startsWith('"title"')) {
      title = line.replace(/^(title:|"title":\s*")/i, "").replace(/["\]]/g, "").trim().slice(0, 60);
      continue;
    }

    // Look for question patterns
    if (line.includes("?") && followUps.length < 3) {
      followUps.push(line.replace(/^[\d\-\*\.]+\s*/, "")); // Strip leading numbers/bullets
    }
  }

  return { title: title || "Untitled conversation", followUps };
}
```

### TypeScript Interface

```typescript
// src/types.ts (or inline in services/ai.ts)

export interface TitleAndFollowUps {
  /** Generated title (max 60 chars) */
  title: string;
  /** Up to 3 follow-up questions */
  followUps: string[];
}

export interface BatchAIError {
  titleError?: string;
  followUpsError?: string;
}
```

---

## 5. Testing Strategy

### Unit Tests

```typescript
// src/services/ai.test.ts

describe("generateTitleAndFollowUps", () => {
  it("returns valid title and follow-ups for normal conversation", async () => {
    const messages = [
      { role: "user", content: "How do I deploy a Cloudflare Worker?" },
      { role: "assistant", content: "You can use wrangler deploy..." },
    ];

    const result = await generateTitleAndFollowUps(mockAi, messages);

    expect(result.title).toBeDefined();
    expect(result.title.length).toBeLessThanOrEqual(60);
    expect(result.followUps.length).toBeLessThanOrEqual(3);
  });

  it("handles malformed JSON with delimiter fallback", async () => {
    // Mock AI returns non-JSON
    const result = await generateTitleAndFollowUps(mockAiReturningPlainText, messages);

    expect(result.title).toBeDefined();
    expect(Array.isArray(result.followUps)).toBe(true);
  });

  it("returns defaults on complete failure", async () => {
    const result = await generateTitleAndFollowUps(failingMockAi, messages);

    expect(result.title).toBe("Untitled conversation");
    expect(result.followUps).toEqual([]);
  });
});
```

### Integration Tests

```typescript
// Test the actual Workers AI model
describe("AI integration (e2e)", () => {
  it("produces quality output with real LLM", async () => {
    // Only run in CI with real API keys
    const result = await generateTitleAndFollowUps(realAi, sampleConversation);

    // Quality assertions
    expect(result.title).not.toContain("Untitled");
    expect(result.followUps.every(q => q.includes("?"))).toBe(true);
  });
});
```

### Quality Verification

1. **Golden Set Testing**: Create 20-30 sample conversations with expected outputs
2. **Compare Outputs**: Run both old (separate) and new (batch) approaches
3. **Metrics to Track**:
   - Title relevance (manual review or LLM-as-judge)
   - Follow-up question quality (relevance, variety)
   - Response time improvement

### A/B Testing Approach

```typescript
// Feature flag in route handler
router.post("/:id/generate-all", async (c) => {
  const useBatch = c.env.FEATURE_BATCH_AI !== "false"; // Default: true

  if (useBatch) {
    const result = await generateTitleAndFollowUps(ai, messages);
    // Log metrics: { method: "batch", duration, success }
    return c.json(result);
  } else {
    // Fallback to separate calls for comparison
    const [title, followUps] = await Promise.all([
      generateTitle(ai, messages),
      generateFollowUps(ai, messages),
    ]);
    // Log metrics: { method: "separate", duration, success }
    return c.json({ title, followUps });
  }
});
```

### Metrics Dashboard

Track in production:
- `ai.batch.latency_p50`, `ai.batch.latency_p99`
- `ai.batch.success_rate`
- `ai.batch.title_quality_score` (sampled, manual)
- `ai.batch.followups_quality_score` (sampled, manual)

---

## 6. Summary

| Aspect | Recommendation |
|--------|----------------|
| Approach | JSON output with delimiter fallback |
| Savings | ~50% fewer calls, ~40% cost reduction |
| Compatibility | Keep existing functions, add new one |
| Risk | Low (graceful fallbacks, feature flag) |
| Effort | ~2-3 hours implementation + testing |

### Next Steps

1. Implement `generateTitleAndFollowUps()` in `src/services/ai.ts`
2. Add unit tests with mock AI
3. Create `/conversations/:id/generate-all` route
4. Add feature flag for gradual rollout
5. Monitor quality metrics in production
6. Update dashboard to use batch endpoint
