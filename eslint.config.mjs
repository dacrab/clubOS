import js from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import vitest from "@vitest/eslint-plugin";

export default tseslint.config(
	{
		ignores: [
			"node_modules",
			".svelte-kit",
			"build",
			"coverage",
			"supabase",
			"static",
			"**/*.d.ts",
		],
	},
	{
		files: ["**/*.{js,ts,svelte}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: { ...globals.browser, ...globals.node },
		},
	},
	js.configs.recommended,
	...tseslint.configs.strict,
	...tseslint.configs.stylistic,
	...svelte.configs["flat/recommended"],
	{
		files: ["**/*.svelte", "**/*.svelte.ts"],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: [".svelte"],
			},
		},
		rules: {
			"svelte/no-at-debug-tags": "error",
			"svelte/no-reactive-functions": "error",
			"svelte/no-navigation-without-resolve": "off",
			"svelte/prefer-svelte-reactivity": "off",
		},
	},
	{
		files: ["**/*.ts"],
		languageOptions: { parser: tseslint.parser },
		rules: {
			"@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
			"@typescript-eslint/explicit-function-return-type": ["warn", { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true }],
			"@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
		},
	},
	{
		files: ["**/*.{test,spec}.ts"],
		plugins: { vitest },
		rules: { ...vitest.configs.recommended.rules },
	},
	{
		files: ["*.config.*", "scripts/**/*.ts"],
		languageOptions: { globals: globals.node },
	},
	{
		rules: {
			"no-console": "error",
			"no-debugger": "error",
			"no-empty": ["error", { allowEmptyCatch: true }],
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/array-type": "off",
		},
	},
);
