import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("shadcn preset b3mPJeumm stack", () => {
  test("components.json records the applied rhea/inter/lucide preset", () => {
    const config = JSON.parse(read("components.json")) as {
      style: string;
      iconLibrary: string;
      tailwind: { css: string; baseColor: string };
    };
    expect(config.style).toBe("base-rhea");
    expect(config.iconLibrary).toBe("lucide");
    expect(config.tailwind.baseColor).toBe("neutral");
    expect(config.tailwind.css).toBe("src/styles/tokens.css");
  });

  test("tokens load Inter and do not declare the old grotesk/jetbrains stack", () => {
    const tokens = read("src/styles/tokens.css");
    expect(tokens).toContain('@import "@fontsource-variable/inter"');
    expect(tokens).toContain("Inter Variable");
    expect(tokens).not.toContain("Space Grotesk");
    expect(tokens).not.toContain("Hanken Grotesk");
    expect(tokens).not.toContain("JetBrains Mono");
    expect(tokens).toContain("--font-heading");
    expect(tokens).toContain("var(--primary)");
  });

  test("layouts that serve / do not import the old font packages", () => {
    for (const file of [
      "src/layouts/RootLayout.astro",
      "src/layouts/MarketingLayout.astro",
    ]) {
      const src = read(file);
      expect(src).not.toContain("@fontsource-variable/space-grotesk");
      expect(src).not.toContain("@fontsource-variable/hanken-grotesk");
      expect(src).not.toContain("@fontsource-variable/jetbrains-mono");
    }
    const pkg = read("package.json");
    expect(pkg).toContain("@fontsource-variable/inter");
    expect(pkg).not.toContain("space-grotesk");
    expect(pkg).not.toContain("hanken-grotesk");
    expect(pkg).not.toContain("jetbrains-mono");
  });

  test("homepage code-tabs tab row wraps instead of painting a scrollbar", () => {
    const home = read("src/pages/index.astro");
    expect(home).toContain("TypeScript");
    expect(home).toContain("Vercel AI");
    expect(home).toContain("LangGraph");
    expect(home).toContain("Python");
    expect(home).toContain("REST");
    const tabs = read("src/components/home/code-tabs.astro");
    expect(tabs).toMatch(/data-ct-copy/);
    expect(tabs).toContain("flex-wrap");
    expect(tabs).not.toMatch(/ct-bar[^>]*overflow-x-auto/);
    expect(tabs).not.toMatch(/\.ct-bar[\s\S]*overflow-x:\s*auto/);
  });
});
