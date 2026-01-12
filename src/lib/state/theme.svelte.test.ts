import { describe, it, expect } from "vitest";
import { theme } from "./theme.svelte";

describe("theme", () => {
	it("setTheme and toggle work correctly", () => {
		theme.setTheme("dark");
		expect(theme.current).toBe("dark");
		theme.setTheme("light");
		expect(theme.current).toBe("light");
		theme.toggle();
		expect(theme.current).toBe("dark");
	});
});
