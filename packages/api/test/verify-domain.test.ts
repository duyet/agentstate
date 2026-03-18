import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("GET /verify-domain/:token", () => {
  it("returns valid token as plain text", async () => {
    const validToken = "agentstate-verify-abc123def456ghij";
    const response = await SELF.fetch(`http://localhost/verify-domain/${validToken}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/^text\/plain/);

    const text = await response.text();
    expect(text).toBe(validToken);
  });

  it("rejects invalid token format", async () => {
    const invalidToken = "invalid-token-format";
    const response = await SELF.fetch(`http://localhost/verify-domain/${invalidToken}`);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid token format");
  });

  it("rejects token without required prefix", async () => {
    const invalidToken = "custom-prefix-abc123def456ghij";
    const response = await SELF.fetch(`http://localhost/verify-domain/${invalidToken}`);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid token format");
  });

  it("rejects token that is too short", async () => {
    const invalidToken = "agentstate-verify-ab12";
    const response = await SELF.fetch(`http://localhost/verify-domain/${invalidToken}`);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid token format");
  });

  it("accepts token with extra characters after minimum length", async () => {
    const longToken = "agentstate-verify-abcdefghijklmnopqrstuvwxyz0123456789";
    const response = await SELF.fetch(`http://localhost/verify-domain/${longToken}`);

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toBe(longToken);
  });
});
