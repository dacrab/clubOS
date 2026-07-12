import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));

const matchMedia = vi.fn(() => ({ matches: false }));
const classList = { add: vi.fn(), remove: vi.fn() };
const store: Record<string, string> = {};

vi.stubGlobal("matchMedia", matchMedia);
vi.stubGlobal("localStorage", {
	getItem: vi.fn((k: string) => store[k] ?? null),
	setItem: vi.fn((k: string, v: string) => {
		store[k] = v;
	}),
});
vi.stubGlobal("document", { documentElement: { classList } });

describe("theme", () => {
	beforeEach(() => {
		vi.resetModules();
		Object.keys(store).forEach((k) => {
			Reflect.deleteProperty(store, k);
		});
		vi.clearAllMocks();
		matchMedia.mockReturnValue({ matches: false });
	});

	it("defaults to system theme", async () => {
		const { theme } = await import("./theme.svelte");
		expect(theme.current).toBe("system");
	});

	it("loads theme from localStorage", async () => {
		store.theme = "dark";
		const { theme } = await import("./theme.svelte");
		expect(theme.current).toBe("dark");
	});

	it("setTheme updates and persists", async () => {
		const { theme } = await import("./theme.svelte");
		theme.setTheme("light");
		expect(theme.current).toBe("light");
		expect(localStorage.setItem).toHaveBeenCalledWith("theme", "light");
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

	it("applies the dark class to <html> and removes it for light", async () => {
		const { theme } = await import("./theme.svelte");
		theme.setTheme("dark");
		expect(classList.add).toHaveBeenCalledWith("dark");
		classList.remove.mockClear();
		theme.setTheme("light");
		expect(classList.remove).toHaveBeenCalledWith("dark");
	});
});
