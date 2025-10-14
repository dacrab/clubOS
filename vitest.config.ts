import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    css: false,
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
    setupFiles: [resolve(process.cwd(), "./vitest-setup-client.ts")],
    expect: { requireAssertions: true },
    allowOnly: false,
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      $lib: resolve(process.cwd(), "./src/lib"),
      $app: resolve(process.cwd(), "./.svelte-kit/runtime/app"),
      "$env/static/public": resolve(process.cwd(), "./vitest-env-public.ts"),
      "$env/dynamic/public": resolve(process.cwd(), "./vitest-env-public.ts"),
    },
  },
});
