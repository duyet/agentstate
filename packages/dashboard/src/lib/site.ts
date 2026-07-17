/**
 * site.ts — Single source of truth for the public site origin (#316).
 *
 * Every place that previously hardcoded `https://agentstate.app` (docs
 * snippets, MCP configs, marketing layout canonical/OG URLs, quick-start
 * code) imports from here, so staging/preview deployments and the
 * custom-domain feature can rebrand the origin with one env var:
 *
 *   PUBLIC_SITE_URL=https://staging.agentstate.app
 *
 * (Astro inlines `PUBLIC_*`-prefixed env vars into client code at build.)
 */

function normalizeOrigin(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : undefined;
}

/** Public site origin, no trailing slash (e.g. "https://agentstate.app"). */
export const SITE_URL =
  normalizeOrigin(import.meta.env.PUBLIC_SITE_URL as string | undefined) ??
  "https://agentstate.app";

/** REST API base, no trailing slash (e.g. "https://agentstate.app/api"). */
export const API_BASE_URL = `${SITE_URL}/api`;

/** Remote MCP endpoint. */
export const MCP_URL = `${SITE_URL}/api/mcp`;

/** Machine-readable integration guide. */
export const AGENTS_MD_URL = `${SITE_URL}/agents.md`;
