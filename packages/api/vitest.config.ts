import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          d1Databases: ["DB"],
          // Override AI binding to avoid requiring Cloudflare auth in CI
          bindings: {
            AI: {},
          },
        },
      },
    },
  },
});
