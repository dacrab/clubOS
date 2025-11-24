import { describe, expect, it } from "vitest";
import { i18nState, type TranslationKey, tt as t } from "./i18n.svelte";

describe("i18n", () => {
	it("returns key when translation missing", () => {
		expect(t("nonexistent.key" as TranslationKey)).toBe("nonexistent.key");
	});

	it("switches language via state", () => {
		i18nState.locale = "el";
		expect(t("nav.dashboard")).toBe("Πίνακας Ελέγχου");
		i18nState.locale = "en";
		expect(t("nav.dashboard")).toBe("Dashboard");
	});
});
