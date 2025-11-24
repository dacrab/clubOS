import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const _dev = process.env.NODE_ENV !== "production";

const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: { trustedOrigins: [] },
		// Restrict primitives by default to avoid accidental server-only imports on client
		alias: {},
	},
};

export default config;
