import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";

function createTheme() {
	let current = $state<Theme>("system");

	if (browser) {
		const stored = localStorage.getItem("theme");
		if (stored === "light" || stored === "dark" || stored === "system") {
			current = stored;
		}
	}

	const applyTheme = () => {
		const isDark = current === "system"
			? typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
			: current === "dark";
		document.documentElement.classList[isDark ? "add" : "remove"]("dark");
	};

	if (browser) applyTheme();

	return {
		get current() { return current; },
		get isDark() {
			return current === "dark" || (current === "system" && browser && typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches);
		},
		setTheme(t: Theme) {
			current = t;
			if (browser) {
				localStorage.setItem("theme", t);
				applyTheme();
			}
		},
		toggle() {
			this.setTheme(this.isDark ? "light" : "dark");
		},
	};
}

export const theme = createTheme();
