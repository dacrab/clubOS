import { browser } from "$app/environment";
import { en, type TranslationsStructure } from "./en";
import { el } from "./el";

export type Locale = "en" | "el";

const translations: Record<Locale, TranslationsStructure> = { en, el };

const getNestedValue = (obj: unknown, path: string): string => {
	const result = path.split(".").reduce<unknown>(
		(acc, key) => (acc && typeof acc === "object" && key in acc ? (acc as Record<string, unknown>)[key] : undefined),
		obj
	);
	return typeof result === "string" ? result : path;
};

function createI18n(): {
	readonly locale: Locale;
	setLocale: (l: Locale) => void;
	t: (key: string) => string;
} {
	let locale = $state<Locale>("en");

	if (browser) {
		const saved = localStorage.getItem("locale");
		if (saved === "en" || saved === "el") locale = saved;
	}

	return {
		get locale() { return locale; },
		setLocale(l: Locale) {
			locale = l;
			if (browser) {
				localStorage.setItem("locale", l);
				document.documentElement.setAttribute("lang", l);
			}
		},
		t(key: string) {
			return getNestedValue(translations[locale], key);
		},
	};
}

export const i18n = createI18n();

export const t = (key: string): string => i18n.t(key);
