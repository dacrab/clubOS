import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";

const prefersDark = () =>
	typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

let current = $state<Theme>("system");

if (browser) {
	const stored = localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "system") current = stored;
}

function apply() {
	const dark = current === "dark" || (current === "system" && prefersDark());
	document.documentElement.classList[dark ? "add" : "remove"]("dark");
}

if (browser) apply();

const THEMES = ["light", "dark", "system"] as const;
export function isValid(t: string): t is Theme {
	return THEMES.includes(t as Theme);
}

export const theme = {
	get current() {
		return current;
	},
	get isDark() {
		return current === "dark" || (current === "system" && browser && prefersDark());
	},
	setTheme(t: Theme) {
		current = t;
		if (browser) {
			localStorage.setItem("theme", t);
			apply();
		}
	},
	toggle() {
		this.setTheme(this.isDark ? "light" : "dark");
	},
};
