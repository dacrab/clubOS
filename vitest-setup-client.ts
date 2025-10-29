// Browser test setup
import { vi } from "vitest";

// Mock localStorage for tests
const localStorageMock = {
	getItem: vi.fn(() => null),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
	writable: true,
});
