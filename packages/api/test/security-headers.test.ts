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
});
