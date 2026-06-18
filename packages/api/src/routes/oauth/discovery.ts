import { Hono } from "hono";
import { API_SCOPES } from "../../lib/scopes";
import type { Bindings, Variables } from "../../types";

// ---------------------------------------------------------------------------
// OAuth / MCP discovery metadata
//
// Mounted at the root so the well-known paths resolve to the Worker origin:
//   GET /.well-known/oauth-protected-resource   (RFC 9728)
//   GET /.well-known/oauth-authorization-server (RFC 8414)
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function origin(reqUrl: string): string {
  return new URL(reqUrl).origin;
}

// RFC 9728 — Protected Resource Metadata. Points MCP clients at this server's
// authorization server and the protected MCP resource.
app.get("/.well-known/oauth-protected-resource", (c) => {
  const o = origin(c.req.url);
  return c.json({
    resource: `${o}/api/mcp`,
    authorization_servers: [o],
    scopes_supported: API_SCOPES,
    bearer_methods_supported: ["header"],
  });
});

// RFC 8414 — Authorization Server Metadata.
app.get("/.well-known/oauth-authorization-server", (c) => {
  const o = origin(c.req.url);
  return c.json({
    issuer: o,
    authorization_endpoint: `${o}/api/oauth/authorize`,
    token_endpoint: `${o}/api/oauth/token`,
    registration_endpoint: `${o}/api/oauth/register`,
    scopes_supported: API_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  });
});

export default app;
