#!/usr/bin/env node
// Generates packages/api/src/content/static.ts from the llms.txt and agents.md
// source files so the served machine-readable content can never drift from the
// human-readable sources. Run via `bun run gen:content` (also runnable with node).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, "..", "packages", "api", "src", "content");

// Escape a raw string for safe embedding inside a JS template literal.
const escapeTemplate = (raw) =>
  raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const llms = readFileSync(join(contentDir, "llms.txt"), "utf8");
const agents = readFileSync(join(contentDir, "agents.md"), "utf8");

const out = `// Auto-generated from llms.txt and agents.md by scripts/generate-content.mjs.
// Do not edit by hand — edit the source files and run \`bun run gen:content\`.

export const LLMS_TXT = \`${escapeTemplate(llms)}\`;

export const AGENTS_MD = \`${escapeTemplate(agents)}\`;
`;

writeFileSync(join(contentDir, "static.ts"), out);
console.log("Generated packages/api/src/content/static.ts");
