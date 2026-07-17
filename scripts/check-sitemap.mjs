#!/usr/bin/env node
// Fails CI if a public marketing page under packages/dashboard/src/pages is
// missing a corresponding <loc> entry in packages/dashboard/public/sitemap.xml,
// so the sitemap can never silently drift from the real route list.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, "..", "packages", "dashboard", "src", "pages");
const sitemapPath = join(here, "..", "packages", "dashboard", "public", "sitemap.xml");
const SITE = "https://agentstate.app";

const files = readdirSync(pagesDir, { recursive: true })
  .filter((f) => f.endsWith(".astro"))
  .map((f) => f.split(sep).join("/"));

// Dashboard and oauth routes are auth-gated app shells, intentionally
// excluded from the sitemap (and noindex'd — see RootLayout.astro).
const isExcluded = (path) => path.startsWith("dashboard/") || path.startsWith("oauth/");

const routes = files.filter((f) => !isExcluded(f)).map((f) => {
  const withoutExt = f.replace(/\.astro$/, "");
  return withoutExt === "index" ? "/" : `/${withoutExt.replace(/\/index$/, "")}`;
});

const sitemap = readFileSync(sitemapPath, "utf8");
const missing = routes.filter((route) => !sitemap.includes(`<loc>${SITE}${route}</loc>`));

if (missing.length > 0) {
  console.error("sitemap.xml is missing entries for:");
  for (const route of missing) console.error(`  - ${SITE}${route}`);
  console.error("\nAdd a <url> entry to packages/dashboard/public/sitemap.xml.");
  process.exit(1);
}

console.log(`sitemap.xml covers all ${routes.length} public marketing route(s).`);
