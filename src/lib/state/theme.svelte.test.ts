import { describe, it, expect, beforeEach } from "vitest";
import { theme, type Theme } from "./theme.svelte";

describe("ThemeState", () => {
	beforeEach(() => {
		// Reset to system before each test to avoid cross-test leakage
		theme.setTheme("system");
	});

	it("setTheme updates the current theme value", () => {
		theme.setTheme("dark");
		expect(theme.current).toBe<Theme>("dark");

		theme.setTheme("light");
		expect(theme.current).toBe<Theme>("light");
	});

	it("toggle switches between light and dark based on isDark", () => {
		theme.setTheme("light");
		expect(theme.current).toBe<Theme>("light");

		theme.toggle();
		expect(theme.current).toBe<Theme>("dark");

		theme.toggle();
		expect(theme.current).toBe<Theme>("light");
	});
});
