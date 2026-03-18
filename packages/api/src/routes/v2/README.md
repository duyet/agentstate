# API v2 Routes

This directory contains the next version of the AgentState API.

## Structure

```
v2/
├── conversations/
│   └── index.ts          # Conversation endpoints (placeholder)
└── projects/
    └── index.ts          # Project endpoints (placeholder)
```

## Adding New v2 Endpoints

When adding new v2 endpoints, follow this pattern:

```typescript
import { Hono } from "hono";
import { apiKeyAuth } from "../../middleware/auth";
import { rateLimitMiddleware } from "../../middleware/rate-limit";
import type { Bindings, Variables } from "../../../types";

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply middleware
router.use("*", apiKeyAuth);
router.use("*", rateLimitMiddleware);

// Define endpoints
router.get("/", (c) => {
  // Your implementation
});

export default router;
```

## Marking v1 Endpoints as Deprecated

When a v2 endpoint replaces a v1 endpoint, add deprecation headers to the v1 endpoint:

```typescript
import { setDeprecationHeaders } from "../../lib/deprecation";

app.get("/api/v1/old-endpoint", (c) => {
  setDeprecationHeaders(c, {
    message: "This endpoint is deprecated. Use /api/v2/new-endpoint instead.",
    sunsetDate: "2026-09-01",
    link: "https://docs.agentstate.app/api/v2/migration"
  });
  // ... rest of implementation
});
```

## Deprecation Header Helper

The `setDeprecationHeaders` function sets the following headers:

- `X-API-Deprecation`: Human-readable deprecation message
- `Sunset`: ISO date when the endpoint will be removed (optional)
- `Link`: URL to migration documentation (optional)

Example middleware usage:

```typescript
import { deprecationMiddleware } from "../../lib/deprecation";

const deprecatedRouter = new Hono();
deprecatedRouter.use("*", deprecationMiddleware({
  message: "This API version is deprecated. Use /api/v2 instead.",
  sunsetDate: "2026-12-31",
  link: "https://docs.agentstate.app/api/v2/overview"
}));
```

## Versioning Strategy

- **v1**: Stable, maintained, backward compatible
- **v2**: New features, breaking changes from v1
- **Sunset period**: Minimum 6 months notice before deprecation
- **Documentation**: Always include migration guide URLs
