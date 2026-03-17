# API Documentation Review Report

**Date**: 2026-03-18
**Reviewer**: Claude Code Autonomous Loop

## Summary

**Overall Assessment**: Needs Work

The API documentation is generally well-structured and accurate for core endpoints, but has significant gaps in newer features and some edge cases. The main documentation files (api-reference.md, integration.md, sdk.md, README.md) are largely consistent with the implementation, but several endpoints added in recent iterations are missing from the documentation.

## Missing Endpoints

The following endpoints exist in the codebase but are **not documented**:

### Conversation Analytics
- **Endpoint**: `GET /v1/conversations/:id/analytics`
- **Location**: `packages/api/src/routes/conversations/analytics.ts`
- **Description**: Returns conversation-level analytics including tags, role breakdown, message counts, token counts, and duration
- **Response fields**:
  - `conversation_id`
  - `title`
  - `message_count`
  - `token_count`
  - `tags` (array)
  - `duration_ms`
  - `messages_by_role` (object with count/tokens per role)
  - `created_at`
  - `updated_at`

### Project Deletion
- **Endpoint**: `DELETE /v1/projects/:id`
- **Location**: `packages/api/src/routes/projects.ts:400`
- **Description**: Deletes a project and cascades to conversations, messages, API keys, and tags
- **Response**: `204 No Content`
- **Error**: `404 NOT_FOUND` if project doesn't exist

### Public Analytics Endpoints
- **Endpoint**: `GET /v1/analytics/timeseries`
- **Endpoint**: `GET /v1/analytics/summary`
- **Endpoint**: `GET /v1/analytics/tags`
- **Location**: `packages/api/src/routes/analytics-public.ts`
- **Description**: Public analytics routes with auth caching, tag filtering, and time-series data
- **Note**: These are routed at `/v1/analytics` and `/api/v1/analytics` (index.ts:65-66)

## Documentation Gaps

### Analytics Section Incomplete

**Current State**: The API reference documents `GET /v1/projects/:id/analytics` (dashboard analytics)

**Missing**:
1. **Public Analytics Routes** - Three endpoints at `/v1/analytics/*`:
   - `GET /v1/analytics/summary` - Summary stats with tag filtering
   - `GET /v1/analytics/timeseries` - Time-series data by metric/granularity
   - `GET /v1/analytics/tags` - Tag usage statistics

2. **Query Parameters Not Documented**:
   - `/v1/analytics/summary`: `start`, `end`, `tag` (multiple)
   - `/v1/analytics/timeseries`: `metric` (conversations/messages/tokens), `granularity` (day/week/month), `start`, `end`, `tag` (multiple)
   - `/v1/analytics/tags`: `start`, `end`, `limit`

3. **Caching Behavior**:
   - All analytics endpoints use AUTH_CACHE with TTL based on time range
   - 1-7 days: 60s TTL
   - 8-30 days: 180s TTL
   - 30+ days: 300s TTL
   - This is an important optimization detail for API consumers

### Project Analytics vs Public Analytics

The documentation currently only covers dashboard project analytics. There's no explanation of:
- When to use `/v1/projects/:id/analytics` (dashboard-internal, no API key auth)
- When to use `/v1/analytics/*` (public API, requires API key auth)

### Error Code for Field Validation

**Current State**: Documentation lists error codes in general section

**Missing**:
- `INVALID_FIELD` error code (returned when invalid `fields` parameter is used on GET /v1/conversations/:id)
- This is used in crud.ts:267 but not in the error codes table

## New Features Not Documented

### Fields Parameter (Already Documented)

**Status**: ✅ Documented in api-reference.md:204-226

The `?fields=` parameter for GET /v1/conversations/:id is properly documented with:
- Valid field names list
- Special `!messages` syntax
- Performance implications
- Code examples

**Note**: This was added in iteration #2 and is now documented.

### Auth Cache Changes

**Status**: ⚠️ Partially Documented

The analytics public routes use AUTH_CACHE, but this behavior is not explained in:
- api-reference.md (no mention of caching)
- integration.md (no guidance on cache implications)
- environment-variables.md (not checked in this review)

### Analytics Improvements

**Status**: ❌ Not Documented

New analytics features added in recent iterations:
- Tag filtering on all analytics endpoints (multiple `tag` query params)
- Custom time ranges (`start` and `end` timestamps)
- Time-series granularity selection (day/week/month)
- Multiple metric types (conversations/messages/tokens)

## Code Examples Issues

### Integration Guide

**Status**: ✅ Current and Accurate

All code examples in integration.md are up-to-date:
- Vercel AI SDK example - current
- Cloudflare Workers AI example - current
- Cloudflare Agents SDK example - current
- LangGraph Python example - current (uses raw HTTP, notes Python SDK pending)
- Generic TypeScript/fetch example - current

### AI Prompt Template

**Status**: ✅ Current and Accurate

The AI prompt template at the end of integration.md (lines 283-318) is accurate and includes all endpoint URLs.

### SDK Documentation

**Status**: ⚠️ Minor Gaps

The sdk.md file lists "SDK Coverage Gaps" (line 186-195) which are accurate:
- Search conversations
- Bulk delete
- Tags management
- Analytics

However, the list is missing the new analytics endpoints (summary/timeseries/tags) and conversation analytics.

## Recommendations

### Priority 1 (Critical)

1. **Document Conversation Analytics Endpoint**
   - Add `GET /v1/conversations/:id/analytics` to api-reference.md
   - Include response schema with all fields
   - Add example response

2. **Document Public Analytics Routes**
   - Add new section for `/v1/analytics/*` endpoints
   - Document query parameters (tag filtering, time ranges, metrics)
   - Explain caching behavior and TTLs
   - Clarify difference between project analytics and public analytics

3. **Add Missing Error Code**
   - Add `INVALID_FIELD` to error codes table in api-reference.md

### Priority 2 (High)

4. **Document Project Deletion**
   - Add `DELETE /v1/projects/:id` to Projects API section
   - Explain cascade behavior
   - Include 404 error case

5. **Update SDK Coverage Gaps**
   - Add new analytics endpoints to the list
   - Add conversation analytics endpoint

6. **Add Environment Variable Documentation**
   - Document AUTH_CACHE binding in environment-variables.md
   - Explain it's optional but recommended for analytics performance

### Priority 3 (Medium)

7. **Add Caching Section**
   - Add general section about caching behavior
   - Document which endpoints use AUTH_CACHE
   - Explain TTL strategies

8. **Improve Analytics Documentation**
   - Add comparison table: when to use which analytics endpoint
   - Include tag filtering examples
   - Add time-series examples with different granularities

9. **SDK Expansion Planning**
   - Note in sdk.md that new analytics endpoints should be wrapped
   - Consider conversation analytics for SDK inclusion

### Priority 4 (Low)

10. **Add OpenAPI Reference**
   - Note that `/openapi.json` is machine-readable (already mentioned)
   - Consider adding OpenAPI spec generation to CI/CD

11. **Document Rate Limiting Scope**
   - Clarify if rate limiting is per-API-key or per-project (appears to be per-key from code)

12. **Webhook Documentation Planning**
   - Note in docs that webhooks are planned (backlog item #10)
   - Prepare documentation structure for future webhook events

## Conclusion

The core API documentation is strong and most consumer-facing features are well-documented. The main gaps are in:
1. Newer analytics features (public routes, tag filtering, time-series)
2. Conversation-level analytics endpoint
3. Project management operations (deletion)
4. Caching behavior documentation

Addressing Priority 1 and 2 items would significantly improve the documentation completeness and accuracy.

## Appendix: Complete Endpoint Inventory

### Documented ✅
- POST /v1/conversations
- GET /v1/conversations (with fields parameter)
- GET /v1/conversations/:id
- GET /v1/conversations/by-external-id/:eid
- PUT /v1/conversations/:id
- DELETE /v1/conversations/:id
- POST /v1/conversations/bulk-delete
- POST /v1/conversations/export
- GET /v1/conversations/search
- POST /v1/conversations/:id/messages
- GET /v1/conversations/:id/messages
- POST /v1/conversations/:id/generate-title
- POST /v1/conversations/:id/follow-ups
- GET /v1/tags
- GET /v1/conversations/:id/tags
- POST /v1/conversations/:id/tags
- DELETE /v1/conversations/:id/tags/:tag
- POST /v1/projects
- GET /v1/projects
- GET /v1/projects/:id
- GET /v1/projects/by-slug/:slug
- GET /v1/projects/:id/conversations
- GET /v1/projects/:id/conversations/:convId/messages
- GET /v1/projects/:id/analytics
- POST /api/projects/:projectId/keys
- GET /api/projects/:projectId/keys
- DELETE /api/projects/:projectId/keys/:keyId
- POST /v1/projects/:id/keys
- DELETE /v1/projects/:id/keys/:keyId
- GET /api
- GET /llms.txt
- GET /agents.md
- GET /openapi.json

### Undocumented ❌
- GET /v1/conversations/:id/analytics
- DELETE /v1/projects/:id
- GET /v1/analytics/summary
- GET /v1/analytics/timeseries
- GET /v1/analytics/tags

### Partially Documented ⚠️
- Analytics caching behavior (mentioned in code, not in docs)
- Tag filtering on list conversations (documented, but not explained in detail)
