import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    exclude: ["svelte-sonner"],
  },
  ssr: {
    noExternal: ["svelte-sonner"],
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: true,
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
  },
  server: {
    strictPort: true,
    fs: { strict: true },
  },
  preview: {
    strictPort: true,
  },
  test: {
    expect: { requireAssertions: true },
    allowOnly: false,
    passWithNoTests: false,
  },
});
