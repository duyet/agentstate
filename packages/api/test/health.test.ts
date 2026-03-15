import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedProject } from "./setup";

describe("GET /", () => {
  beforeAll(async () => {
    await applyMigrations();
    await seedProject();
  });

  it("returns health response with correct shape", async () => {
    const response = await SELF.fetch("http://localhost/");
    expect(response.status).toBe(200);

    const body = await response.json<{ name: string; version: string; status: string }>();
    expect(body.name).toBe("agentstate");
    expect(body.version).toBe("0.1.0");
    expect(body.status).toBe("ok");
  });
});
