import { vi, beforeEach } from "vitest";

// Mock localStorage
const createLocalStorageMock = () => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			const { [key]: _, ...rest } = store;
			store = rest;
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
	};
};

const localStorageMock = createLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// Mock document
vi.stubGlobal("document", {
	...document,
	documentElement: {
		setAttribute: vi.fn(),
		getAttribute: vi.fn(),
		classList: {
			add: vi.fn(),
			remove: vi.fn(),
			toggle: vi.fn(),
		},
	},
});

// Reset mocks between tests
beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
});
