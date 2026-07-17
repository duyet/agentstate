import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { applyMigrations, seedProject } from "./setup";

describe("Security headers", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("sets all four security headers on a successful JSON response", async () => {
    const response = await SELF.fetch("http://localhost/api");
    expect(response.status).toBe(200);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it("sets all four security headers on an error response (401 from protected route)", async () => {
    // A request to a protected route with no auth header triggers a 401 short-circuit.
    // Security headers must still be present even when a handler short-circuits early.
    const response = await SELF.fetch("http://localhost/v1/conversations");
    expect(response.status).toBe(401);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  it("sets an enforcing default-src 'none' CSP on JSON API responses", async () => {
    const response = await SELF.fetch("http://localhost/api");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'none'");
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  });

  it("sets a Report-Only CSP with frame-ancestors 'none' on dashboard HTML responses", async () => {
    // Falls through index.ts's catch-all to the ASSETS binding (test fixture
    // at test/fixtures/assets/), which stands in for the real dashboard build.
    const response = await SELF.fetch("http://localhost/dashboard");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const csp = response.headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(response.headers.get("Content-Security-Policy")).toBeNull();

    // The baseline headers still apply to asset responses now that they flow
    // through the Worker (assets.run_worker_first).
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
