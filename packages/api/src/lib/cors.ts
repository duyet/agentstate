// ---------------------------------------------------------------------------
// CORS origin resolution
// ---------------------------------------------------------------------------
//
// Pulled out of index.ts as a pure function so the allow/deny logic can be
// unit tested without spinning up the Worker. The global CORS middleware sets
// `credentials: true`, so per the Fetch spec we must NEVER answer with `"*"`
// and must NEVER reflect an origin that isn't actually allowed — both are
// invalid/misleading when credentials are in play.

/** Origins allowed in every environment, including production. */
const PRODUCTION_ORIGINS = ["https://agentstate.app"];

/** Additional origins allowed only outside of production (local dev servers). */
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8787",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8787",
];

/**
 * Resolve the Access-Control-Allow-Origin value for a request.
 *
 * Returns `null` when no header should be sent — for a missing Origin header,
 * or an Origin that isn't on the allow list. Never falls back to `"*"` or to
 * an unrelated allowed origin, since either would be sent alongside
 * `Access-Control-Allow-Credentials: true`.
 *
 * `environment` should be the Worker's `ENVIRONMENT` binding. Localhost
 * origins are only permitted when it is not `"production"`.
 */
export function resolveAllowedOrigin(
  origin: string | undefined,
  environment: string | undefined,
): string | null {
  if (!origin) return null;
  const allowedOrigins =
    environment === "production" ? PRODUCTION_ORIGINS : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];
  return allowedOrigins.includes(origin) ? origin : null;
}
