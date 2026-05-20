import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
      miniflare: {
        d1Databases: ["DB"],
        bindings: {
          AI: {},
        },
      },
    }),
  ],
  test: {
    fileParallelism: false,
  },
});
