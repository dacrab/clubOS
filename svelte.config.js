import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const dev = process.env.NODE_ENV !== "production";

const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: { trustedOrigins: [] },
		csp: {
			mode: "auto",
			directives: dev
				? {
						"default-src": ["self"],
						"base-uri": ["self"],
						"object-src": ["none"],
						// Allow Vite dev client inline/eval and blobs
						"script-src": ["self", "unsafe-inline", "unsafe-eval", "blob:"],
						// Allow Google Fonts CSS in dev and inline styles from Tailwind
						"style-src": ["self", "unsafe-inline", "https:"],
						"img-src": ["self", "data:", "https:"],
						// Allow local supabase REST, Vite HMR and websockets in dev
						"connect-src": [
							"self",
							"https:",
							"http://127.0.0.1:54321",
							"ws:",
							"wss:",
							"http://localhost:5173",
							"http://localhost:4173",
						],
						"font-src": ["self", "https:", "data:"],
						"frame-ancestors": ["none"],
						"form-action": ["self"],
					}
				: {
						"default-src": ["self"],
						"base-uri": ["self"],
						"object-src": ["none"],
						"script-src": ["self"],
						// Allow Google Fonts stylesheet and inline styles used by SvelteKit/body wrapper
						"style-src": ["self", "unsafe-inline", "https:"],
						"img-src": ["self", "data:", "https:"],
						// Allow HTTPS APIs such as Supabase; include wss for realtime and local CLI for preview
						"connect-src": [
							"self",
							"https:",
							"wss:",
							"http://127.0.0.1:54321",
							"http://localhost:54321",
						],
						"font-src": ["self", "https:", "data:"],
						"frame-ancestors": ["none"],
						"form-action": ["self"],
					},
		},
		// Restrict primitives by default to avoid accidental server-only imports on client
		alias: {},
	},
};

export default config;
