// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Kumo + base-ui call React.createContext at module eval. Under Vite these
// must be pre-bundled (optimizeDeps.include) and kept internal for SSR so the
// right React runtime resolves — the equivalent of Next's `transpilePackages`.
// All four are listed explicitly to match the original next.config.ts.
const KUMO_DEPS = [
  "@cloudflare/kumo",
  "@cloudflare/kumo/components/button",
  "@cloudflare/kumo/components/surface",
  "@base-ui/react",
  "@phosphor-icons/react",
  "echarts",
];

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
      include: KUMO_DEPS,
      // Only scan the Astro entry points for deps. The legacy Next.js tree under
      // src/app/ still imports `next/*` (removed in Phase 3); excluding it here
      // stops Vite's dependency scanner from choking on unresolvable imports.
      entries: ["src/pages/**/*.{astro,tsx,ts}"],
    },
    ssr: {
      noExternal: KUMO_DEPS,
    },
  },
});
