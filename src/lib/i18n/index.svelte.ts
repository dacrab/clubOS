import { browser } from "$app/environment";
import el from "./el.json";
import en from "./en.json";
import type { TranslationsStructure } from "./types";

export type Locale = "en" | "el";

function isTranslations(v: unknown): v is TranslationsStructure {
	return typeof v === "object" && v !== null;
}

const translations = {
	en,
	el: isTranslations(el) ? el : (en as TranslationsStructure),
};

const getNestedValue = (obj: unknown, path: string): string => {
	const result = path
		.split(".")
		.reduce<unknown>(
			(acc, key) =>
				acc && typeof acc === "object" && key in acc
					? (acc as Record<string, unknown>)[key]
					: undefined,
			obj,
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
		get locale() {
			return locale;
		},
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
