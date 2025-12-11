/**
 * Vitest Global Setup
 *
 * Configures global mocks and test utilities for the entire test suite.
 * Includes:
 * - localStorage mock with full Storage API
 * - document mock for SSR compatibility
 * - Global test reset between tests
 * - Environment variable mocks
 * - Svelte state module mocks
 */

import { vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// SVELTE STATE MOCK (must be before any imports that use $state)
// ============================================================================

vi.mock("$lib/state/settings.svelte", () => ({
	settings: {
		current: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		formatSettings: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		load: vi.fn(),
		save: vi.fn(),
	}
}));

// ============================================================================
// LOCALSTORAGE MOCK
// ============================================================================

interface StorageMock extends Storage {
	clear: ReturnType<typeof vi.fn>;
}

const createLocalStorageMock = (): StorageMock => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string): string | null => store[key] ?? null),
		setItem: vi.fn((key: string, value: string): void => {
			store[key] = String(value);
		}),
		removeItem: vi.fn((key: string): void => {
			store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
		}),
		clear: vi.fn((): void => {
			store = {};
		}),
		get length(): number {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
	};
};

const localStorageMock = createLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// ============================================================================
// SESSIONSTORAGE MOCK
// ============================================================================

const sessionStorageMock = createLocalStorageMock();
vi.stubGlobal("sessionStorage", sessionStorageMock);

// ============================================================================
// DOCUMENT MOCK
// ============================================================================

vi.stubGlobal("document", {
	...document,
	documentElement: {
		setAttribute: vi.fn(),
		getAttribute: vi.fn().mockReturnValue(null),
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
			toggle: vi.fn(),
			contains: vi.fn().mockReturnValue(false),
		},
		style: {},
	},
	cookie: "",
	querySelector: vi.fn().mockReturnValue(null),
	querySelectorAll: vi.fn().mockReturnValue([]),
	getElementById: vi.fn().mockReturnValue(null),
	createElement: vi.fn().mockReturnValue({
		setAttribute: vi.fn(),
		appendChild: vi.fn(),
		style: {},
	}),
});

// ============================================================================
// WINDOW MOCK ADDITIONS
// ============================================================================

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
// PERFORMANCE API (for performance tests)
// ============================================================================

if (typeof performance === "undefined") {
	vi.stubGlobal("performance", {
		now: vi.fn(() => Date.now()),
		mark: vi.fn(),
		measure: vi.fn(),
		getEntriesByName: vi.fn().mockReturnValue([]),
		getEntriesByType: vi.fn().mockReturnValue([]),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
	});
}

// ============================================================================
// TEST LIFECYCLE HOOKS
// ============================================================================

beforeEach(() => {
	// Reset storage mocks
	localStorageMock.clear();
	sessionStorageMock.clear();

	// Clear all mock call history
	vi.clearAllMocks();
});

afterEach(() => {
	// Restore any spied functions
	vi.restoreAllMocks();
});

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

// Make vi available globally for convenience
declare global {
	var testUtils: {
		createMockResponse: (body: unknown, init?: ResponseInit) => Response;
		createMockRequest: (url: string, init?: RequestInit) => Request;
		waitFor: (ms: number) => Promise<void>;
	};
}

globalThis.testUtils = {
	createMockResponse: (body: unknown, init: ResponseInit = {}): Response => {
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { "Content-Type": "application/json" },
			...init,
		});
	},

	createMockRequest: (url: string, init: RequestInit = {}): Request => {
		return new Request(url, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			...init,
		});
	},

	waitFor: (ms: number): Promise<void> => {
		return new Promise((resolve) => setTimeout(resolve, ms));
	},
};
