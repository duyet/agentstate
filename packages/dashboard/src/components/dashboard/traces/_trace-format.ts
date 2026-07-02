/**
 * Formatting helpers specific to trace/observation data (tokens, duration).
 * Cost and date formatting reuse the shared dashboard utilities in `@/lib`.
 */

export function formatTraceTokens(tokens: number): string {
  if (tokens === 0) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

export function formatObservationDuration(
  startTime: number | null,
  endTime: number | null,
): string {
  if (startTime === null || endTime === null) return "-";
  const ms = endTime - startTime;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
