import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("terminal TUI stack", () => {
  test("components.json still records the shadcn style metadata", () => {
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

  test("tokens load JetBrains Mono and pin a square terminal palette", () => {
    const tokens = read("src/styles/tokens.css");
    expect(tokens).toContain('@import "@fontsource-variable/jetbrains-mono"');
    expect(tokens).toContain("JetBrains Mono Variable");
    expect(tokens).not.toContain("Inter Variable");
    expect(tokens).not.toContain("Space Grotesk");
    expect(tokens).not.toContain("Hanken Grotesk");
    expect(tokens).toContain("--font-heading");
    expect(tokens).toContain("var(--primary)");
    expect(tokens).toContain("#0d1117");
    expect(tokens).toContain("--radius: 0px");
  });

  test("tokens default to dark; light is an opt-in html.light class", () => {
    const tokens = read("src/styles/tokens.css");
    expect(tokens).toContain(":root,");
    expect(tokens).toContain(".dark {");
    expect(tokens).toContain(".light {");
    expect(tokens).toMatch(/:root,\s*\n\.dark \{[^}]*color-scheme: dark/);
    expect(tokens).toMatch(/\.light \{[^}]*color-scheme: light/);
    const script = read("src/components/theme-script.astro");
    expect(script).toContain("localStorage.theme === 'light'");
    expect(script).not.toContain("prefers-color-scheme");
  });

  test("layouts that serve / do not import the old grotesk/inter packages", () => {
    for (const file of [
      "src/layouts/RootLayout.astro",
      "src/layouts/MarketingLayout.astro",
    ]) {
      const src = read(file);
      expect(src).not.toContain("@fontsource-variable/space-grotesk");
      expect(src).not.toContain("@fontsource-variable/hanken-grotesk");
      expect(src).not.toContain("@fontsource-variable/inter");
    }
    const pkg = read("package.json");
    expect(pkg).toContain("@fontsource-variable/jetbrains-mono");
    expect(pkg).not.toContain("space-grotesk");
    expect(pkg).not.toContain("hanken-grotesk");
    expect(pkg).not.toContain("@fontsource-variable/inter");
  });

  test("homepage is a terminal document with code-tabs that wrap", () => {
    const home = read("src/pages/index.astro");
    expect(home).toContain("TypeScript");
    expect(home).toContain("Vercel AI");
    expect(home).toContain("LangGraph");
    expect(home).toContain("Python");
    expect(home).toContain("REST");
    expect(home).toContain("what's inside");
    expect(home).toContain("TuiEditor");
    const tabs = read("src/components/home/code-tabs.astro");
    expect(tabs).toMatch(/data-ct-copy/);
    expect(tabs).toContain("flex-wrap");
    expect(tabs).not.toMatch(/ct-bar[^>]*overflow-x-auto/);
    expect(tabs).not.toMatch(/\.ct-bar[\s\S]*overflow-x:\s*auto/);
  });
});
