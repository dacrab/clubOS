import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  esbuild: {
    // strip debug statements from production builds
    drop: ["console", "debugger"],
  },
  resolve: {
    dedupe: [
      // avoid duplicated svelte instances in mono-repos or linked packages
      "svelte",
      "@sveltejs/kit",
    ],
  },
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
    reportCompressedSize: false,
    ssrEmitAssets: false,
    chunkSizeWarningLimit: 600,
    // ensure deterministic chunking and hashing for stable deploys
    cssMinify: true,
  },
  server: {
    strictPort: true,
    fs: { strict: true },
  },
  preview: {
    strictPort: true,
  },
});
