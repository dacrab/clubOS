import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";

export function isValid(v: unknown): v is Theme {
	return v === "light" || v === "dark" || v === "system";
}
const prefersDark = (): boolean =>
	typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

function createTheme(): {
	readonly current: Theme;
	readonly isDark: boolean;
	setTheme: (t: Theme) => void;
	toggle: () => void;
} {
	let current = $state<Theme>("system");

	if (browser) {
		const stored = localStorage.getItem("theme");
		if (isValid(stored)) current = stored;
	}

	const apply = (): void => {
		const dark = current === "dark" || (current === "system" && prefersDark());
		document.documentElement.classList[dark ? "add" : "remove"]("dark");
	};

	if (browser) apply();

	return {
		get current() {
			return current;
		},
		get isDark() {
			return current === "dark" || (current === "system" && browser && prefersDark());
		},
		setTheme(t) {
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
}

export const theme = createTheme();
