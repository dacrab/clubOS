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

function createI18n() {
	let locale = $state<Locale>("en");

	if (browser) {
		const saved = localStorage.getItem("locale");
		if (saved === "en" || saved === "el") locale = saved;
	}

	return {
		get locale() { return locale; },
		setLocale(l: Locale): void {
			locale = l;
			if (browser) {
				localStorage.setItem("locale", l);
				document.documentElement.setAttribute("lang", l);
			}
		},
		t(key: string): string {
			return getNestedValue(translations[locale], key);
		},
	};
}

export const i18n = createI18n();

export function t(key: string): string {
	return i18n.t(key);
}
