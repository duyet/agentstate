# Rate Limit Upgrade: Fixed-Window to Sliding Window

## Current Implementation

Location: `src/middleware/rate-limit.ts`

- **Algorithm**: Fixed-window counter
- **Window size**: 60 seconds (aligned to UTC minute boundaries)
- **Limit**: 100 requests per window
- **Storage**: D1 (SQLite) table `rate_limits`

---

## 1. Problem Analysis: Fixed-Window Boundary Issue

### How the Bypass Works

Fixed-window rate limiting resets at strict boundaries (e.g., 00:00, 01:00, 02:00). This creates a vulnerability at window transitions:

```
Timeline (60-second windows):

Window 1: [00:00 ─────────────────────────── 01:00)
Window 2: [01:00 ─────────────────────────── 02:00)

Attacker sends 100 requests at 00:59 → Allowed (Window 1 count = 100)
Attacker sends 100 requests at 01:01 → Allowed (Window 2 count = 100)

Result: 200 requests in 2 seconds (2× the intended rate)
```

### Time Diagram

```
        Window 1                    Window 2
├─────────────────────────────┼─────────────────────────────┤
0                            60                            120 (seconds)
                    ↑         ↑
                   100 req   100 req
                   at 59s    at 61s

Actual: 200 requests in 2 seconds
Intended: 100 requests per 60 seconds
```

### Severity Assessment

- **Impact**: Medium — allows burst of 2× rate limit
- **Likelihood**: Low — requires intentional timing
- **Mitigating factors**: Current implementation notes this as accepted trade-off

---

## 2. Sliding Window Algorithm

### How It Works

Track individual request timestamps within a rolling window. Count requests where `timestamp > (now - window_size)`.

```
Timeline:

Now = 90s, Window = 60s
Cutoff = 30s

Requests: [20s] [40s] [50s] [80s] [85s]
Count: 4 (requests at 40s, 50s, 80s, 85s are within window)
Request at 20s is outside window → not counted
```

### Data Structure

```typescript
interface SlidingWindowState {
  apiKeyHash: string;
  timestamps: number[];  // Sorted array of request timestamps (ms)
}
```

### Pseudocode

```typescript
function slidingWindowRateLimit(
  state: SlidingWindowState,
  now: number,
  windowMs: number,
  limit: number
): { allowed: boolean; count: number; retryAfter: number } {
  const cutoff = now - windowMs;

  // Remove expired timestamps (keep only recent)
  state.timestamps = state.timestamps.filter(t => t > cutoff);

  const count = state.timestamps.length;

  if (count >= limit) {
    // Calculate when oldest request will expire
    const oldestTimestamp = state.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return { allowed: false, count, retryAfter };
  }

  // Record this request
  state.timestamps.push(now);

  return { allowed: true, count: count + 1, retryAfter: 0 };
}
```

### Complexity

- **Time**: O(n) where n = requests in window (for filtering)
- **Space**: O(limit) — at most `limit` timestamps stored per key
- **Optimization**: Use sorted array + binary search for O(log n) operations

---

## 3. Token Bucket Alternative

### How It Works

```typescript
interface TokenBucket {
  tokens: number;      // Current tokens available
  lastRefill: number;  // Last refill timestamp (ms)
}

const BUCKET_CAPACITY = 100;
const REFILL_RATE = 100 / 60_000;  // tokens per ms (100 per minute)

function tokenBucketRateLimit(
  bucket: TokenBucket,
  now: number
): { allowed: boolean; tokens: number; retryAfter: number } {
  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(
    BUCKET_CAPACITY,
    bucket.tokens + elapsed * REFILL_RATE
  );
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfter = Math.ceil(tokensNeeded / REFILL_RATE / 1000);
    return { allowed: false, tokens: bucket.tokens, retryAfter };
  }

  bucket.tokens -= 1;
  return { allowed: true, tokens: bucket.tokens, retryAfter: 0 };
}
```

### Comparison

| Aspect | Sliding Window | Token Bucket |
|--------|----------------|--------------|
| Precision | Exact | Approximate |
| Burst handling | Strict limit | Allows configured burst |
| Memory | O(n) timestamps | O(1) state |
| Implementation | More complex | Simpler |
| Reset behavior | Gradual | Tokens refill continuously |
| Fairness | Better | Can accumulate |

### Recommendation

**Sliding window** is preferred when:
- Strict rate enforcement is critical
- Fairness between users matters
- Memory overhead is acceptable

**Token bucket** is preferred when:
- Simplicity is valued
- Some burst tolerance is acceptable
- Memory must be minimized

---

## 4. Implementation for Cloudflare Workers

### Option A: D1-Based Sliding Window

Store timestamps in a normalized table:

```sql
CREATE TABLE rate_limit_events (
  id TEXT PRIMARY KEY,
  api_key_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_rate_events_key_time
  ON rate_limit_events(api_key_hash, timestamp);
```

**Implementation:**

```typescript
export const slidingWindowRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const db = c.get("db");
  const apiKeyHash = c.get("apiKeyHash");
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Count requests in sliding window
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.apiKeyHash, apiKeyHash),
        gt(rateLimitEvents.timestamp, cutoff)
      )
    );

  const count = result[0]?.count ?? 0;

  if (count >= RATE_LIMIT) {
    // Find oldest request for retry calculation
    const oldest = await db
      .select({ timestamp: rateLimitEvents.timestamp })
      .from(rateLimitEvents)
      .where(eq(rateLimitEvents.apiKeyHash, apiKeyHash))
      .orderBy(rateLimitEvents.timestamp)
      .limit(1);

    const retryAfter = oldest[0]
      ? Math.ceil((oldest[0].timestamp + WINDOW_MS - now) / 1000)
      : 60;

    return c.json({ error: { code: "RATE_LIMITED", message: "..." } }, 429);
  }

  // Record this request
  await db.insert(rateLimitEvents).values({
    id: nanoid(),
    apiKeyHash,
    timestamp: now,
  });

  // Cleanup old events (fire-and-forget)
  c.executionCtx.waitUntil(
    db.delete(rateLimitEvents).where(lt(rateLimitEvents.timestamp, cutoff))
  );

  await next();
});
```

**Pros:** Distributed-safe, exact sliding window
**Cons:** Higher D1 write cost, more storage

### Option B: Workers KV (Recommended for Distributed)

```typescript
import { RateLimiter } from "@cloudflare/workers-types";

export const kvRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const kv = c.env.RATE_LIMITS;  // KV namespace binding
  const apiKeyHash = c.get("apiKeyHash");
  const key = `ratelimit:${apiKeyHash}`;

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Get current state
  const state = await kv.get<SlidingWindowState>(key, "json")
    ?? { apiKeyHash, timestamps: [] };

  // Filter and count
  state.timestamps = state.timestamps.filter(t => t > cutoff);
  const count = state.timestamps.length;

  if (count >= RATE_LIMIT) {
    const retryAfter = Math.ceil(
      (state.timestamps[0] + WINDOW_MS - now) / 1000
    );
    return c.json({ error: { code: "RATE_LIMITED", message: "..." } }, 429);
  }

  // Add and save
  state.timestamps.push(now);
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: 120,  // Auto-expire after 2 minutes
  });

  await next();
});
```

**Pros:** Distributed-safe, automatic expiration, lower D1 cost
**Cons:** Eventually consistent (rare race conditions possible)

### Option C: In-Memory (Single Instance Only)

```typescript
// ⚠️ NOT suitable for multi-instance deployments
const memoryStore = new Map<string, number[]>();

export const memoryRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const apiKeyHash = c.get("apiKeyHash");
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = memoryStore.get(apiKeyHash) ?? [];
  timestamps = timestamps.filter(t => t > cutoff);

  if (timestamps.length >= RATE_LIMIT) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    return c.json({ error: { code: "RATE_LIMITED", message: "..." } }, 429);
  }

  timestamps.push(now);
  memoryStore.set(apiKeyHash, timestamps);

  await next();
});
```

**Pros:** Zero external cost, fastest performance
**Cons:** NOT distributed-safe, lost on worker restart

### Recommended Approach

**Use Workers KV (Option B)** for production:

1. Add KV namespace binding to `wrangler.jsonc`:
   ```jsonc
   "kv_namespaces": [
     { "binding": "RATE_LIMITS", "id": "..." }
   ]
   ```

2. Implement sliding window with KV storage
3. Keep D1 as fallback for KV outages (hybrid approach)

---

## 5. Migration Path

### Phase 1: Add KV Namespace (No Behavior Change)

1. Create KV namespace: `wrangler kv:namespace create RATE_LIMITS`
2. Add binding to `wrangler.jsonc`
3. Deploy — no code changes yet

### Phase 2: Implement Sliding Window (Parallel Path)

1. Create new middleware: `src/middleware/rate-limit-sliding.ts`
2. Add feature flag to switch between implementations:
   ```typescript
   const useSlidingWindow = c.env.ENABLE_SLIDING_WINDOW === "true";
   ```

### Phase 3: Gradual Rollout

1. Enable for 10% of requests (canary)
2. Monitor latency and error rates
3. Increase to 50%, then 100%

### Phase 4: Cleanup

1. Remove old fixed-window implementation
2. Drop `rate_limits` D1 table (or keep for audit)

### Backward Compatibility

- **API headers**: No changes (same `X-RateLimit-*` headers)
- **Error response**: Same format (`RATE_LIMITED` code)
- **Retry-After**: May differ slightly (more accurate with sliding window)

### Testing Strategy

```typescript
describe("Sliding Window Rate Limit", () => {
  it("allows exactly RATE_LIMIT requests in any 60-second window", async () => {
    // Send 100 requests at t=0
    // Send 50 more at t=30 (should allow 50)
    // Send 50 more at t=31 (should deny all, window still has 100)
  });

  it("rejects requests at 2× burst at window boundary", async () => {
    // Send 100 at t=59s → allowed
    // Send 1 at t=61s → should be denied (100 still in window)
    // Wait until t=119s → request allowed (59s request expired)
  });

  it("calculates accurate Retry-After", async () => {
    // Fill limit at t=0
    // Verify Retry-After ≈ 60s
  });
});
```

---

## Summary

| Aspect | Current | Upgraded |
|--------|---------|----------|
| Algorithm | Fixed-window | Sliding window |
| Bypass risk | 2× at boundaries | None |
| Storage | D1 table | Workers KV |
| Write cost | 1 upsert/request | 1 put/request |
| Accuracy | Minute-aligned | Exact |
