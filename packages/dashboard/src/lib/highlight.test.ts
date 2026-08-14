import { describe, expect, test } from "bun:test";
import { highlightCode, resolveLang } from "./highlight";

describe("resolveLang", () => {
  test("maps marketing tab labels to shiki ids", () => {
    expect(resolveLang("typescript")).toBe("typescript");
    expect(resolveLang("sdk")).toBe("typescript");
    expect(resolveLang("python")).toBe("python");
    expect(resolveLang("rest")).toBe("bash");
  });
});

describe("highlightCode", () => {
  test("ships wrap styles and does not paint a horizontal overflow track", async () => {
    const html = await highlightCode(
      'import { AgentState } from "@agentstate/sdk";\nconst client = new AgentState({ apiKey: process.env.AS_KEY });\n',
      "typescript",
    );
    expect(html).toContain("as-shiki-pre");
    expect(html).toContain("white-space:pre-wrap");
    expect(html).not.toMatch(/overflow-x\s*:\s*auto/);
    expect(html).toContain("font-mono");
  });
});
