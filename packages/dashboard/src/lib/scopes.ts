import type { ApiScope } from "@agentstate/shared";

// Human-readable catalog of API-key permission scopes, mirroring the API's
// API_SCOPES taxonomy. Used by the key-creation form and the OAuth consent
// screen so both render the same labels.

export interface ScopeDef {
  value: ApiScope;
  label: string;
  description: string;
}

export interface ScopeGroup {
  resource: string;
  label: string;
  scopes: ScopeDef[];
}

export const SCOPE_GROUPS: ScopeGroup[] = [
  {
    resource: "conversations",
    label: "Conversations",
    scopes: [
      { value: "conversations:read", label: "Read", description: "List and read conversations" },
      {
        value: "conversations:write",
        label: "Write",
        description: "Create, update, tag, and delete conversations",
      },
    ],
  },
  {
    resource: "state",
    label: "State",
    scopes: [
      { value: "state:read", label: "Read", description: "Read and query state records" },
      { value: "state:write", label: "Write", description: "Create and overwrite state" },
      { value: "state:watch", label: "Watch", description: "Subscribe to the state event stream" },
    ],
  },
  {
    resource: "leases",
    label: "Leases",
    scopes: [
      { value: "lease:write", label: "Write", description: "Acquire, renew, and release leases" },
    ],
  },
  {
    resource: "claims",
    label: "Claims",
    scopes: [{ value: "claim:write", label: "Write", description: "Create and verify claims" }],
  },
  {
    resource: "analytics",
    label: "Analytics",
    scopes: [{ value: "analytics:read", label: "Read", description: "Read usage analytics" }],
  },
  {
    resource: "webhooks",
    label: "Webhooks",
    scopes: [{ value: "webhooks:write", label: "Manage", description: "Manage webhooks" }],
  },
  {
    resource: "domains",
    label: "Domains",
    scopes: [{ value: "domains:write", label: "Manage", description: "Manage custom domains" }],
  },
  {
    resource: "keys",
    label: "API keys",
    scopes: [
      { value: "keys:read", label: "Read", description: "List API keys and capability tokens" },
      {
        value: "keys:write",
        label: "Manage",
        description: "Create and revoke keys and capability tokens",
      },
    ],
  },
];

export const ALL_SCOPES: ApiScope[] = SCOPE_GROUPS.flatMap((g) => g.scopes.map((s) => s.value));

/** Human label for a stored scope value, including the `*` and `resource:*` wildcards. */
export function scopeLabel(scope: string): string {
  if (scope === "*") return "Full access";
  const [resource, action] = scope.split(":");
  if (action === "*") return `${resource} (all)`;
  return `${resource}:${action}`;
}
