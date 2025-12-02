import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/lib/**/*.ts"],
			exclude: [
				"src/lib/**/*.svelte",
				"src/lib/**/index.ts",
				"src/lib/types/**",
				"src/lib/server/**",
			],
		},
		typecheck: {
			enabled: true,
		},
	},
	resolve: {
		alias: {
			$lib: "/src/lib",
			$app: "/src/app-mocks",
		},
	},
});
