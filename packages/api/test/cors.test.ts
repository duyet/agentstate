import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { resolveAllowedOrigin } from "../src/lib/cors";

describe("resolveAllowedOrigin", () => {
  it("returns null for a missing origin (never falls back to '*')", () => {
    // Regression: with credentials: true, "*" + Access-Control-Allow-Credentials
    // is invalid per the Fetch spec and rejected by browsers.
    expect(resolveAllowedOrigin(undefined, undefined)).toBeNull();
    expect(resolveAllowedOrigin("", undefined)).toBeNull();
  });

  it("returns null for a disallowed origin (never reflects an unrelated allowed origin)", () => {
    // Regression: the old fallback reflected ALLOWED_ORIGINS[0] for any
    // disallowed origin instead of omitting the header.
    expect(resolveAllowedOrigin("https://evil.example", undefined)).toBeNull();
    expect(resolveAllowedOrigin("https://evil.example", "production")).toBeNull();
  });

  it("reflects the production origin in every environment", () => {
    expect(resolveAllowedOrigin("https://agentstate.app", undefined)).toBe(
      "https://agentstate.app",
    );
    expect(resolveAllowedOrigin("https://agentstate.app", "production")).toBe(
      "https://agentstate.app",
    );
  });

  it("allows localhost origins outside of production", () => {
    expect(resolveAllowedOrigin("http://localhost:3000", undefined)).toBe("http://localhost:3000");
    expect(resolveAllowedOrigin("http://127.0.0.1:8787", "development")).toBe(
      "http://127.0.0.1:8787",
    );
  });

  it("rejects localhost origins in production", () => {
    // Regression: any page open on a loopback port must not be able to make
    // credentialed cross-origin calls to the production API.
    expect(resolveAllowedOrigin("http://localhost:3000", "production")).toBeNull();
    expect(resolveAllowedOrigin("http://127.0.0.1:8787", "production")).toBeNull();
  });
});

describe("CORS headers on live requests (ENVIRONMENT unset, dev-like)", () => {
  it("reflects an allowed origin and sets credentials", async () => {
    const res = await SELF.fetch("http://localhost/api", {
      headers: { Origin: "https://agentstate.app" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://agentstate.app");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("omits Access-Control-Allow-Origin for a disallowed origin", async () => {
    const res = await SELF.fetch("http://localhost/api", {
      headers: { Origin: "https://evil.example" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("omits Access-Control-Allow-Origin when no Origin header is sent", async () => {
    const res = await SELF.fetch("http://localhost/api");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
