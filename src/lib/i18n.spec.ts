import { describe, expect, it } from "vitest";
import { locale, t } from "./i18n";

describe("i18n", () => {
	it("returns key when translation missing", () => {
		expect(t("nonexistent.key" as any)).toBe("nonexistent.key");
	});

	it("switches language via store", () => {
		locale.set("el");
		expect(t("nav.dashboard")).toBe("Πίνακας Ελέγχου");
		locale.set("en");
		expect(t("nav.dashboard")).toBe("Dashboard");
	});
});
