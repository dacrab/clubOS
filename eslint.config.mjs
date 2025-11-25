import js from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default tseslint.config(
	// Ignore generated and external directories
	{
		ignores: [
			"**/node_modules/**",
			"**/.svelte-kit/**",
			"**/.vercel/**",
			"**/.cursor/**",
			"**/.factory/**",
			"**/.vscode/**",
			"**/.git/**",
			"**/.github/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/supabase/**",
			"**/static/**",
			"**/*.d.ts",
			"eslint.config.*",
		],
	},
	// Shared language options for all JS/TS/Svelte files
	{
		files: ["**/*.{js,cjs,mjs,ts,cts,mts,svelte}"]
		,
		languageOptions: {
			// Modern ESM everywhere
			 ecmaVersion: "latest",
			 sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	// Base JS recommendations
	js.configs.recommended,
	// Strict TypeScript rules (non-type-checked for speed)
	...tseslint.configs.strict,
	...tseslint.configs.stylistic,
	// Svelte + a11y recommendations
	...svelte.configs["flat/recommended"],
	// Svelte file settings
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: [".svelte"],
			},
		},
		rules: {
			"svelte/no-at-debug-tags": "error",
			"svelte/no-reactive-functions": "error",
			// We use absolute paths everywhere, no need for resolve()
			"svelte/no-navigation-without-resolve": "off",
			// SvelteDate is experimental, allow regular Date for now
			"svelte/prefer-svelte-reactivity": "off",
			// Svelte 5 patterns: _args destructuring is intentional
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
		},
	},
	// TypeScript-specific rules (including .svelte.ts state modules)
	{
		files: ["**/*.{ts,cts,mts}"],
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", disallowTypeAnnotations: false },
			],
			"@typescript-eslint/explicit-function-return-type": [
				"warn",
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
				},
			],
			"@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
		},
	},
	// Node-focused config for tooling and scripts
	{
		files: [
			"vite.config.*",
			"svelte.config.*",
			"vitest.config.*",
			"scripts/**/*.{js,ts}",
			"*.config.*",
			".eslintrc.*",
		],
		languageOptions: {
			globals: globals.node,
		},
		rules: {
			"@typescript-eslint/no-var-requires": "off",
		},
	},
	// Global defaults / hygiene rules
	{
		rules: {
			"no-console": "error",
			"no-debugger": "error",
			"no-empty": ["error", { allowEmptyCatch: true }],
			// Rely on the TS-aware version above
			"no-unused-vars": "off",
			// Allow type aliases (interface vs type is a style choice)
			"@typescript-eslint/consistent-type-definitions": "off",
			// Allow Array<T> syntax
			"@typescript-eslint/array-type": "off",
		},
	},
);
