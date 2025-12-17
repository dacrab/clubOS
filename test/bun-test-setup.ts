// Global shim for the Svelte 5 `$state` rune when running tests with `bun test`.
// In the real Svelte app build, the compiler injects the actual implementation.
// Bun's test runner executes the raw TypeScript modules, so we provide a minimal
// runtime fallback that simply returns the initial value.

type StateFunction = <T>(value: T) => T;

const globalObject = globalThis as typeof globalThis & { $state?: StateFunction };

if (typeof globalObject.$state !== "function") {
	globalObject.$state = <T>(value: T): T => value;
}


