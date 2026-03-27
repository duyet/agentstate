/**
 * Format microdollars to a human-readable cost string.
 * - 0: "$0.00"
 * - < $0.01: "<$0.01"
 * - $0.01–$99.99: "$X.XX"
 * - >= $100: "$XXX" (no cents)
 */
export function formatCostMicrodollars(microdollars: number): string {
  if (microdollars === 0) return "$0.00";
  const dollars = microdollars / 1_000_000;
  if (dollars < 0.01) return "<$0.01";
  if (dollars >= 100) return `$${Math.round(dollars).toLocaleString()}`;
  return `$${dollars.toFixed(2)}`;
}
