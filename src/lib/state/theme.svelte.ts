import { browser } from "$app/environment";

export type Theme = "light" | "dark" | "system";

class ThemeState {
	current = $state<Theme>("system");
	
	constructor() {
		if (browser) {
			const stored = localStorage.getItem("theme");
			if (stored === "light" || stored === "dark" || stored === "system") {
				this.current = stored;
			}
			this.applyTheme();
		}
	}

	get isDark(): boolean {
		if (this.current === "system") {
			return browser && window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		return this.current === "dark";
	}

	setTheme(theme: Theme): void {
		this.current = theme;
		if (browser) {
			localStorage.setItem("theme", theme);
			this.applyTheme();
		}
	}

	toggle(): void {
		const newTheme = this.isDark ? "light" : "dark";
		this.setTheme(newTheme);
	}

	private applyTheme(): void {
		if (!browser) return;
		
		const root = document.documentElement;
		const isDark = this.isDark;
		
		if (isDark) {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}
}

export const theme = new ThemeState();
