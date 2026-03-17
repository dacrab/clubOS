import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		target: "es2022",
		minify: "esbuild",
		reportCompressedSize: false,
	},
	server: {
		strictPort: true,
		fs: { strict: true },
	},
});
