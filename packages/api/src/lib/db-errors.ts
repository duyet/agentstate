/**
 * db-errors.ts — Classification helpers for D1/SQLite driver errors.
 */

/**
 * True if a DB error is a SQLite/D1 UNIQUE constraint violation.
 *
 * Drizzle (and the raw D1 driver) wrap the underlying SQLite error in a
 * generic `Failed query: …` / `D1_ERROR` Error and attach the original (whose
 * message carries "UNIQUE constraint failed") as `.cause`, so the whole cause
 * chain is inspected.
 */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current != null && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (/unique constraint failed/i.test(message)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}
