import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";

function createTheme(): {
	readonly current: Theme;
	readonly isDark: boolean;
	setTheme(t: Theme): void;
	toggle(): void;
} {
	let current = $state<Theme>("system");

	// Read from localStorage on init (browser only)
	if (browser) {
		const stored = localStorage.getItem("theme");
		if (stored === "light" || stored === "dark" || stored === "system") {
			current = stored;
		}
	}

	function applyTheme(): void {
		const isDarkNow = current === "system"
			? typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
			: current === "dark";
		if (isDarkNow) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	// Apply on first render
	if (browser) applyTheme();

	return {
		get current() { return current; },
		get isDark() {
			if (current === "system") {
				return browser && typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
			}
			return current === "dark";
		},
		setTheme(t: Theme): void {
			current = t;
			if (browser) {
				localStorage.setItem("theme", t);
				applyTheme();
			}
		},
		toggle(): void {
			this.setTheme(this.isDark ? "light" : "dark");
		},
	};
}

export const theme = createTheme();
