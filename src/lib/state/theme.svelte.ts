export type Theme = "light" | "dark" | "system";

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

class ThemeState {
	current = $state<Theme>("system");
	
	constructor() {
		if (isBrowser) {
			const stored = localStorage.getItem("theme");
			if (stored === "light" || stored === "dark" || stored === "system") {
				this.current = stored;
			}
			this.applyTheme();
		}
	}

	get isDark(): boolean {
		if (this.current === "system") {
			return (
				isBrowser &&
				typeof matchMedia === "function" &&
				matchMedia("(prefers-color-scheme: dark)").matches
			);
		}
		return this.current === "dark";
	}

	setTheme(theme: Theme): void {
		this.current = theme;
		if (isBrowser) {
			localStorage.setItem("theme", theme);
			this.applyTheme();
		}
	}

	toggle(): void {
		const newTheme = this.isDark ? "light" : "dark";
		this.setTheme(newTheme);
	}

	private applyTheme(): void {
		if (!isBrowser) return;
		
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
