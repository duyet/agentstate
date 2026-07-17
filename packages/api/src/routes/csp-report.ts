import { Hono } from "hono";
import type { Bindings, Variables } from "../types";

/**
 * Receives Content-Security-Policy violation reports (`report-uri`) from the
 * dashboard's Report-Only policy (see middleware/security-headers.ts).
 * Unauthenticated by design — browsers POST these with no credentials.
 * Logs a summary only; no report bodies are persisted.
 */
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.post("/", async (c) => {
  const report = await c.req.json().catch(() => null);
  const blockedUri = report?.["csp-report"]?.["blocked-uri"];
  const violatedDirective = report?.["csp-report"]?.["violated-directive"];
  console.log(
    JSON.stringify({
      level: "info",
      message: "csp_report_only_violation",
      blocked_uri: blockedUri,
      violated_directive: violatedDirective,
    }),
  );
  return c.body(null, 204);
});

export default app;
