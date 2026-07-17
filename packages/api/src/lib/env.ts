/**
 * env.ts — Parsing helpers for operator-supplied environment variables.
 */

/**
 * Parse an env var that must be a positive integer, falling back to the
 * documented default when it is unset, blank, non-numeric, zero, negative,
 * or fractional.
 *
 * WHY the strictness: `Number("") === 0` and `Number.isFinite(0)` is true, so
 * a naive `Number.isFinite` guard silently turns an accidentally-blank
 * override (e.g. an empty `RATE_LIMIT_MAX` in a wrangler vars template) into
 * a limit of ZERO — blocking every request on that deployment (#291).
 * Misconfiguration must fail open to the default, never closed to a
 * self-inflicted denial of service.
 */
export function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw.trim());
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
