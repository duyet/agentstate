// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// These call React.createContext at module eval. Under Vite they must be
// pre-bundled (optimizeDeps.include) and kept internal for SSR so the right
// React runtime resolves — the equivalent of Next's `transpilePackages`.
const REACT_CONTEXT_DEPS = ["@phosphor-icons/react", "echarts"];

// Fail loud on production deploys when the Clerk publishable key is missing or
// a placeholder. The key is inlined at build time (import.meta.env) and Clerk
// decodes its frontend-API + CDN host *from the key itself*, so an empty key
// silently ships a dashboard that builds `https:///npm/@clerk/clerk-js…` and
// can't load. Local/preview builds keep working with `pk_test_placeholder`
// because this guard only runs when REQUIRE_CLERK_KEY=1 (set in the deploy job).
if (process.argv.includes("build") && process.env.REQUIRE_CLERK_KEY === "1") {
  const key = (process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  const valid = /^pk_(live|test)_.{12,}$/.test(key) && key !== "pk_test_placeholder";
  if (!valid) {
    throw new Error(
      "PUBLIC_CLERK_PUBLISHABLE_KEY is missing or a placeholder, but REQUIRE_CLERK_KEY=1. " +
        "Set the PUBLIC_CLERK_PUBLISHABLE_KEY repo secret to a real Clerk key " +
        "(pk_live_… / pk_test_…) before deploying. Refusing to ship a dashboard that " +
        "cannot load Clerk JS.",
    );
  }
}

// https://astro.build/config
export default defineConfig({
  output: "static",
  // Emit `out/index.html`, `out/brand/index.html`, … matching the previous
  // Next.js `output: "export"` + `trailingSlash: true` directory layout that
  // the API Worker serves from `packages/dashboard/out/`.
  build: {
    format: "directory",
  },
  outDir: "out",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // The ported React components still `import Link from "next/link"` and
        // `import { usePathname } from "next/navigation"`. The dashboard is a
        // statically-exported SPA, so these resolve to local shims that render
        // plain <a> tags and read window.location. This lets Phase-2 workers
        // port dashboard pages without editing every import.
        "next/link": new URL("./src/lib/link.tsx", import.meta.url).pathname,
        "next/navigation": new URL("./src/lib/navigation.ts", import.meta.url).pathname,
      },
    },
    optimizeDeps: {
      include: REACT_CONTEXT_DEPS,
      // Only scan the Astro entry points for deps. The legacy Next.js tree under
      // src/app/ still imports `next/*` (removed in Phase 3); excluding it here
      // stops Vite's dependency scanner from choking on unresolvable imports.
      entries: ["src/pages/**/*.{astro,tsx,ts}"],
    },
    ssr: {
      noExternal: REACT_CONTEXT_DEPS,
    },
  },
});
