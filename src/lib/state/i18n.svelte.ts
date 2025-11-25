import { type Locale, type TranslationKey, translations } from "$lib/i18n/translations";

function getNestedTranslation(
	obj: Record<string, unknown>,
	path: string,
	current: Locale,
): string | undefined {
	const keys = path.split(".");
	let result: unknown = obj;
	for (const key of keys) {
		if (
			typeof result === "object" &&
			result !== null &&
			key in (result as Record<string, unknown>)
		) {
			result = (result as Record<string, unknown>)[key];
		} else {
			return;
		}
	}
	if (
		typeof result === "object" &&
		result !== null &&
		current in (result as Record<string, string>)
	) {
		return (result as Record<string, string>)[current];
	}
	return;
}

class I18nState {
	locale = $state<Locale>("en");

	constructor() {
		if (typeof window !== "undefined") {
			const saved = window.localStorage.getItem("locale");
			if (saved === "en" || saved === "el") {
				this.locale = saved;
			}
			// Subscribe to changes to update DOM/storage
			$effect.root((): void => {
				$effect((): void => {
					const val = this.locale;
					try {
						window.localStorage.setItem("locale", val);
					} catch {
						/* ignore */
					}
					try {
						document.documentElement.setAttribute("lang", val);
					} catch {
						/* ignore */
					}
				});
			});
		}
	}

	set(l: Locale): void {
		this.locale = l;
	}

	// Helper to get translation function derived from current locale
	get t() {
		return (key: TranslationKey): string =>
			getNestedTranslation(translations, key, this.locale) ?? key;
	}
}

export const i18nState = new I18nState();

export type { TranslationKey, Locale };

// Legacy export for non-reactive usage if needed, but using i18nState.t(key) is preferred in components
// or just import i18nState and use i18nState.t(key)
export function t(key: TranslationKey): string {
	return i18nState.t(key);
}

// For reactivity in Svelte 5, just use i18nState.t(key) in the template.
// Since `t` is a getter that depends on `locale` ($state), accessing it in a template (effect) will track dependencies.
// Wait, `t` returns a function. The function closure captures `this.locale`?
// No, `get t()` returns a new function each time `locale` changes?
// Actually `get t()` accesses `this.locale`.
// So if I do `let { t } = i18nState`, `t` might be stale?
// It's better to expose `t` as a function that reads state.

// Correct approach for Svelte 5:
// Just use `i18nState.locale` if you need the locale.
// For translation, use `tt` - it reads `i18nState.locale` so it's reactive in templates.
export function tt(key: TranslationKey): string {
	return getNestedTranslation(translations, key, i18nState.locale) ?? key;
}
