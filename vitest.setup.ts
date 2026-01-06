/**
 * Vitest Global Setup
 * Configures mocks for SvelteKit and browser APIs
 */

import { vi, beforeEach, afterEach } from "vitest";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ============================================================================
// SVELTEKIT MODULE MOCKS
// ============================================================================

vi.mock("$app/environment", () => ({
	browser: true,
	dev: true,
	building: false,
	version: "test",
}));

vi.mock("$app/navigation", () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn(),
	pushState: vi.fn(),
	replaceState: vi.fn(),
}));

// ============================================================================
// SVELTE 5 RUNES MOCK
// ============================================================================

vi.stubGlobal("$state", (<T>(value: T): T => value) as <T>(value: T) => T);

vi.mock("$lib/state/settings.svelte", () => ({
	settings: {
		current: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		formatSettings: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		load: vi.fn(),
		save: vi.fn(),
	},
}));

// ============================================================================
// LOCALSTORAGE MOCK
// ============================================================================

const createStorageMock = (): Storage => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string): string | null => store[key] ?? null,
		setItem: (key: string, value: string): void => { store[key] = String(value); },
		removeItem: (key: string): void => { store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key)); },
		clear: (): void => { store = {}; },
		get length(): number { return Object.keys(store).length; },
		key: (index: number): string | null => Object.keys(store)[index] ?? null,
	};
};

const localStorageMock = createStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// ============================================================================
// DOCUMENT & WINDOW MOCKS
// ============================================================================

vi.stubGlobal("document", {
	...document,
	documentElement: {
		setAttribute: vi.fn(),
		getAttribute: vi.fn().mockReturnValue(null),
		classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn().mockReturnValue(false) },
		style: {},
	},
	cookie: "",
	querySelector: vi.fn().mockReturnValue(null),
	querySelectorAll: vi.fn().mockReturnValue([]),
	getElementById: vi.fn().mockReturnValue(null),
	createElement: vi.fn().mockReturnValue({ setAttribute: vi.fn(), appendChild: vi.fn(), style: {} }),
});

vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
})));

// ============================================================================
// TEST LIFECYCLE
// ============================================================================

beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});
