import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				org: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,
				authToken: process.env.SENTRY_AUTH_TOKEN,
			},
		}),
		tailwindcss(),
		sveltekit(),
	],
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
