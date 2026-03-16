# Test Coverage Analysis

_Generated: 2026-03-16_

## Current State

**5 test files, 79 tests** covering: auth (5), conversations (36), projects (31), API keys (6), health (1).

## Coverage Gaps (by priority)

### P0 — Untested Modules

#### 1. AI Routes & Service (`routes/ai.ts`, `services/ai.ts`)
**Risk: High** — Zero test coverage for two endpoints.

| Endpoint | Scenarios to test |
|----------|------------------|
| `POST /:id/generate-title` | Success with valid conversation, fallback on AI error, non-existent conversation (404), empty conversation (no messages), auth required |
| `POST /:id/follow-ups` | Success returns 3 questions, AI error returns empty array, non-existent conversation (404), auth required |

Requires mocking `env.AI` (Workers AI binding).

#### 2. Request ID Middleware (`middleware/request-id.ts`)
**Risk: Medium** — Input validation not verified.

| Scenario | Expected |
|----------|----------|
| No `X-Request-Id` header | Auto-generated nanoid in response |
| Valid custom ID (`my-req-123`) | Passthrough in response header |
| Invalid ID (special chars, >64 chars) | Rejected or sanitized |
| Empty string ID | Falls back to auto-generated |

#### 3. Global Error Handler (`index.ts` `app.onError`)
**Risk: Medium** — Unhandled exceptions could leak stack traces.

| Scenario | Expected |
|----------|----------|
| Unhandled exception in route | 500 + `{ error: { code: "INTERNAL_ERROR", message: "..." } }` |
| No stack trace leaked | Error message is generic |

### P1 — Security Gaps

#### 4. Cross-Tenant Isolation
**Risk: High** — Partially tested but critical.

| Scenario | Expected |
|----------|----------|
| API key A reads conversation from project B (by ID) | 404 NOT_FOUND (not 403, to avoid ID enumeration) |
| API key A appends messages to project B's conversation | 404 NOT_FOUND |
| API key A updates project B's conversation | 404 NOT_FOUND |
| API key A deletes project B's conversation | 404 NOT_FOUND |
| API key A exports with project B's conversation IDs | Excluded from results |

#### 5. Auth Edge Cases
| Scenario | Expected |
|----------|----------|
| `Authorization: Basic <token>` (wrong scheme) | 401 |
| Multiple Authorization headers | Defined behavior |

### P2 — Input Validation Edge Cases

#### 6. Pagination Boundaries
| Scenario | Expected |
|----------|----------|
| `limit=0` | 400 or default |
| `limit=-1` | 400 |
| `limit=1000` (over max) | Clamped to max |
| Invalid cursor (random string) | 400 or empty results |
| Cursor from different project | Empty results |

#### 7. Conversation Edge Cases
| Scenario | Expected |
|----------|----------|
| Very large metadata (>1MB JSON) | 400 or defined limit |
| Update with `null` metadata (clear) | Metadata cleared |
| Message with empty string content | Accepted or rejected? |
| All role types (`user`, `assistant`, `system`, `tool`) | Accepted |
| Message with 0 token_count | Accepted |

#### 8. Export Boundaries
| Scenario | Expected |
|----------|----------|
| Export exactly 100 IDs (boundary) | 200 success |
| Export with mix of valid + invalid IDs | Returns only valid |
| Export conversation with 0 messages | Included with empty messages array |

### P3 — Low Priority

#### 9. Static Content Endpoints
| Endpoint | Test |
|----------|------|
| `GET /llms.txt` | 200, non-empty, text content-type |
| `GET /agents.md` | 200, non-empty, text content-type |
| `GET /openapi.json` | 200, valid JSON, correct OpenAPI structure |

#### 10. CORS Middleware
| Scenario | Expected |
|----------|----------|
| Preflight `OPTIONS` request | Correct CORS headers |
| Cross-origin `GET` request | `Access-Control-Allow-Origin` header |

#### 11. `lastUsedAt` Fire-and-Forget
| Scenario | Expected |
|----------|----------|
| Successful API call | `lastUsedAt` updated on the API key |

## Recommended Implementation Order

1. **AI routes** — Highest risk, zero coverage, requires AI mock setup
2. **Cross-tenant isolation** — Security-critical, reuses existing test infrastructure
3. **Request ID middleware** — Quick win, simple tests
4. **Pagination edge cases** — Prevents crashes from malformed input
5. **Auth edge cases** — Hardens security boundary
6. **Global error handler** — Ensures graceful failure
7. **Static endpoints** — Quick wins
8. **Remaining edge cases** — As needed

## Estimated Effort

| Priority | Tests to add | Effort |
|----------|-------------|--------|
| P0 (untested modules) | ~15 tests | Medium |
| P1 (security) | ~10 tests | Medium |
| P2 (edge cases) | ~15 tests | Low-Medium |
| P3 (low priority) | ~8 tests | Low |
| **Total** | **~46 tests** | |

This would bring the test count from 79 to ~125.
