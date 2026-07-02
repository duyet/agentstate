# API Historical Reference: the "v2" proposal

> **There is no v2 API, and there is nothing to migrate.** Everything lives under `/api/v1/*` (with a deprecated `/v1/*` alias for conversations, tags, and public analytics). See the **[API Reference](./api-reference.md)** for the authoritative, live specification.

## Background

At one point a parallel "API v2" was drafted to change some conventions (a `PATCH` update method, an `?include=messages` param, `pagination.total`, renamed response fields, excluding messages from the create response, etc.). That parallel stack was later removed and **most of those proposed changes were never adopted for the conversations/messages API**. The live behavior is documented in the API Reference; the notable points where the live API differs from that old proposal:

| Area | Old "v2" proposal | Live `/api/v1/*` behavior |
|------|-------------------|---------------------------|
| Conversation update method | `PATCH` | `PUT` (projects do use `PATCH`) |
| Field selection on Get Conversation | `?include=messages` (opt-in) | Messages returned by default; use `?fields=` / `?fields=!messages` |
| Create Conversation response | Excludes messages | **Includes** the created `messages` |
| Append Messages response | `204 No Content` | `201 Created` with the created messages |
| List Messages cursor | `created_at` timestamp | Message ID |
| List pagination | `pagination.total` added | No `total` on conversation/message/project lists (State query endpoints do return `total`) |
| Response field names | `conversation_id`, `key_id`, etc. | `id` (conversations, keys, projects) |
| Public analytics | `project_id` query param | Project derived from the API key; no `project_id` param |

## Deprecation headers

The codebase contains a `setDeprecationHeaders` utility (`packages/api/src/lib/deprecation.ts`) that can emit `X-API-Deprecation`, `Sunset`, and `Link` response headers. No routes currently call it — no deprecation or sunset headers are emitted in production responses.

## Additional resources

- [API Reference](./api-reference.md) — complete live API documentation
- [Integration Guide](./integration.md) — framework-specific examples

---

**Status:** Historical note. The "v2" proposal was dropped; `/api/v1/*` is the only API.
