import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
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
	plugins: [sentrySvelteKit(sentryOptions), tailwindcss(), sveltekit()],
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
