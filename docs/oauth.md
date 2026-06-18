# OAuth 2.1

AgentState supports **OAuth 2.1 with PKCE** so MCP clients (and other apps) can connect on
behalf of a user without the user pasting a raw API key. The user signs in, picks a project,
and approves a set of [scopes](permissions.md) on a consent screen. The client receives a
short-lived access token it sends as a Bearer token.

AgentState is **both** the authorization server and the resource server — you discover,
authorize, and call the API against the same origin (`https://agentstate.app`).

If you just want to paste a token, you don't need OAuth — see the
[remote MCP server](mcp.md#remote-mcp-server-hosted) Bearer-token mode. OAuth is for clients
that run the browser flow automatically.

## Flow overview

```
1. Discover     GET  /.well-known/oauth-protected-resource
                GET  /.well-known/oauth-authorization-server
2. Register     POST /api/oauth/register            (Dynamic Client Registration)
3. Authorize    GET  /api/oauth/authorize  → consent screen → redirect with ?code=
4. Token        POST /api/oauth/token                (exchange code + PKCE verifier)
5. Refresh      POST /api/oauth/token                (grant_type=refresh_token)
```

Access tokens are short-lived (about 1 hour). Refresh tokens rotate — each refresh returns a
new refresh token and invalidates the old one.

## 1. Discovery

### Protected resource metadata (RFC 9728)

```
GET https://agentstate.app/.well-known/oauth-protected-resource
```

```json
{
  "resource": "https://agentstate.app/api",
  "authorization_servers": ["https://agentstate.app"],
  "scopes_supported": [
    "conversations:read", "conversations:write",
    "state:read", "state:write", "state:watch",
    "lease:write", "claim:write",
    "analytics:read", "webhooks:write", "domains:write",
    "keys:read", "keys:write"
  ],
  "bearer_methods_supported": ["header"]
}
```

A `401` from the API points clients here:

```
WWW-Authenticate: Bearer resource_metadata="https://agentstate.app/.well-known/oauth-protected-resource"
```

### Authorization server metadata (RFC 8414)

```
GET https://agentstate.app/.well-known/oauth-authorization-server
```

```json
{
  "issuer": "https://agentstate.app",
  "authorization_endpoint": "https://agentstate.app/api/oauth/authorize",
  "token_endpoint": "https://agentstate.app/api/oauth/token",
  "registration_endpoint": "https://agentstate.app/api/oauth/register",
  "scopes_supported": [
    "conversations:read", "conversations:write",
    "state:read", "state:write", "state:watch",
    "lease:write", "claim:write",
    "analytics:read", "webhooks:write", "domains:write",
    "keys:read", "keys:write"
  ],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

## 2. Dynamic Client Registration (RFC 7591)

Most MCP clients register themselves automatically.

```bash
curl -X POST https://agentstate.app/api/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["http://127.0.0.1:33418/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none"
  }'
```

```json
{
  "client_id": "client_abc123",
  "client_name": "My MCP Client",
  "redirect_uris": ["http://127.0.0.1:33418/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

Public clients use `token_endpoint_auth_method: "none"` and rely on PKCE — there is no
client secret.

## 3. Authorize → consent → code

Generate a PKCE verifier and its S256 challenge, then send the user's browser to the
authorize endpoint:

```
GET https://agentstate.app/api/oauth/authorize
      ?response_type=code
      &client_id=client_abc123
      &redirect_uri=http://127.0.0.1:33418/callback
      &scope=conversations:read%20conversations:write%20state:read%20state:write
      &state=<opaque-csrf-value>
      &code_challenge=<base64url-sha256-of-verifier>
      &code_challenge_method=S256
```

The user signs in (Clerk), **chooses which project** to grant access to, and **approves the
requested scopes** on the consent screen. On approval AgentState redirects back:

```
http://127.0.0.1:33418/callback?code=<authorization_code>&state=<opaque-csrf-value>
```

Verify that `state` matches the value you sent.

## 4. Token exchange

Exchange the code for tokens, sending the original PKCE verifier:

```bash
curl -X POST https://agentstate.app/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d grant_type=authorization_code \
  -d code=<authorization_code> \
  -d redirect_uri=http://127.0.0.1:33418/callback \
  -d client_id=client_abc123 \
  -d code_verifier=<original-pkce-verifier>
```

```json
{
  "access_token": "<access-token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "<refresh-token>",
  "scope": "conversations:read conversations:write state:read state:write"
}
```

Call the API (and the [remote MCP server](mcp.md#remote-mcp-server-hosted)) with the access
token:

```
Authorization: Bearer <access-token>
```

The granted scopes match what the user approved on the consent screen, limited to the chosen
project.

## 5. Refresh tokens

Access tokens expire after about an hour. Use the refresh token to get a new one. Refresh
tokens **rotate** — store the new refresh token from each response and discard the old one.

```bash
curl -X POST https://agentstate.app/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d grant_type=refresh_token \
  -d refresh_token=<refresh-token> \
  -d client_id=client_abc123
```

```json
{
  "access_token": "<new-access-token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "<new-refresh-token>",
  "scope": "conversations:read conversations:write state:read state:write"
}
```

## Related docs

- [Remote MCP server](mcp.md#remote-mcp-server-hosted) — connect MCP clients via OAuth or a token
- [Permissions & Scopes](permissions.md) — what each scope grants
- [API Reference](api-reference.md) — REST API surface
