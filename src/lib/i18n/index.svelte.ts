import { browser } from "$app/environment";
import { en, type TranslationsStructure } from "./en";
import { el } from "./el";

export type Locale = "en" | "el";

const translations: Record<Locale, TranslationsStructure> = { en, el };

function getNestedValue(obj: unknown, path: string): string {
	const keys = path.split(".");
	let result: unknown = obj;

	for (const key of keys) {
		if (result && typeof result === "object" && key in result) {
			result = (result as Record<string, unknown>)[key];
		} else {
			return path;
		}
	}

	return typeof result === "string" ? result : path;
}

class I18n {
	locale = $state<Locale>("en");

	constructor() {
		if (browser) {
			const saved = localStorage.getItem("locale");
			if (saved === "en" || saved === "el") {
				this.locale = saved;
			}
		}
	}

	setLocale(locale: Locale): void {
		this.locale = locale;
		if (browser) {
			localStorage.setItem("locale", locale);
			document.documentElement.setAttribute("lang", locale);
		}
	}

	t(key: string): string {
		return getNestedValue(translations[this.locale], key);
	}
}

export const i18n = new I18n();

export function t(key: string): string {
	return i18n.t(key);
}

export { en, el };
export type { TranslationsStructure };
