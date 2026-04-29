import { describe, it, expect, beforeEach, vi } from "vitest";

const mockMatchMedia = vi.fn(() => ({ matches: false }));
const mockClassList = { add: vi.fn(), remove: vi.fn() };
const mockLocalStorage = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => mockLocalStorage.store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => { mockLocalStorage.store[key] = value; }),
	clear: () => { mockLocalStorage.store = {}; },
};

vi.stubGlobal("matchMedia", mockMatchMedia);
vi.stubGlobal("localStorage", mockLocalStorage);
vi.stubGlobal("document", { documentElement: { classList: mockClassList } });

describe("theme", () => {
	beforeEach(() => {
		vi.resetModules();
		mockLocalStorage.clear();
		mockLocalStorage.getItem.mockClear();
		mockLocalStorage.setItem.mockClear();
		mockClassList.add.mockClear();
		mockClassList.remove.mockClear();
		mockMatchMedia.mockReturnValue({ matches: false });
	});

	it("defaults to system theme", async () => {
		const { theme } = await import("./theme.svelte");
		expect(theme.current).toBe("system");
	});

	it("loads theme from localStorage", async () => {
		mockLocalStorage.store["theme"] = "dark";
		const { theme } = await import("./theme.svelte");
		expect(theme.current).toBe("dark");
	});

	it("setTheme updates and persists", async () => {
		const { theme } = await import("./theme.svelte");
		theme.setTheme("light");
		expect(theme.current).toBe("light");
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
	});

	it("isDark reflects current theme", async () => {
		const { theme } = await import("./theme.svelte");
		theme.setTheme("dark");
		expect(theme.isDark).toBe(true);
		theme.setTheme("light");
		expect(theme.isDark).toBe(false);
	});

	it("toggle switches between light and dark", async () => {
		const { theme } = await import("./theme.svelte");
		theme.setTheme("light");
		theme.toggle();
		expect(theme.current).toBe("dark");
	});
});
