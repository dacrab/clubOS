import { sentrySvelteKit } from "@sentry/sveltekit/vite";
import adapter from "@sveltejs/adapter-vercel";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const hasSentryCredentials = Boolean(
	process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

const sentryOptions = {
	autoUploadSourceMaps: hasSentryCredentials,
	telemetry: hasSentryCredentials,
};

export default defineConfig({
	plugins: [
		sentrySvelteKit(sentryOptions),
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			csp: {
				// mode 'nonce' makes Kit generate a per-request nonce, add it to
				// script-src/style-src plus 'strict-dynamic' on script-src, and emit
				// the CSP header. Third-party JS (Clerk, Sentry loaders) is loaded
				// dynamically from our nonce'd bundle, so strict-dynamic admits it.
				mode: "nonce",

				directives: {
					"default-src": ["self"],
					"script-src": [
						// Host entries are ignored by CSP3 browsers once 'strict-dynamic'
						// is present (Kit injects it); they only serve as a CSP2 fallback.
						"self",
						"https://*.clerk.accounts.dev",
						"https://js.sentry-cdn.com",
					],
					"style-src": ["self", "unsafe-inline", "https://fonts.googleapis.com"],
					"img-src": [
						"self",
						"data:",
						"blob:",
						"https://img.clerk.com",
						"https://*.clerk.accounts.dev",
					],
					"font-src": ["self", "https://fonts.gstatic.com"],
					"connect-src": [
						"self",
						"https://*.clerk.accounts.dev",
						"https://*.ingest.sentry.io",
						"wss://*.clerk.accounts.dev",
					],
					"frame-src": ["self", "https://*.clerk.accounts.dev"],
					"object-src": ["none"],
					"base-uri": ["self"],
					"form-action": ["self"],
				},
			},
		}),
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
