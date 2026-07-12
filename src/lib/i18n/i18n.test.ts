import { beforeEach, describe, expect, it } from "vitest";
import el from "./el.json";
import en from "./en.json";
import { i18n, t } from "./index.svelte";

const getKeys = (obj: unknown, prefix = ""): string[] => {
	if (!obj || typeof obj !== "object") return [];
	return Object.entries(obj).flatMap(([k, v]) => {
		const key = prefix ? `${prefix}.${k}` : k;
		return typeof v === "object" && !Array.isArray(v) ? getKeys(v, key) : [key];
	});
};

const getValue = (obj: unknown, path: string): unknown =>
	path.split(".").reduce((a: unknown, p) => (a as Record<string, unknown>)?.[p], obj);

describe("i18n", () => {
	it("en and el have matching keys", () => {
		const enKeys = getKeys(en).sort(),
			elKeys = getKeys(el).sort();
		expect(enKeys.filter((k) => !elKeys.includes(k))).toEqual([]);
		expect(elKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
	});

	it("placeholders match between locales", () => {
		const issues = getKeys(en).filter((key) => {
			const enVal = getValue(en, key),
				elVal = getValue(el, key);
			if (typeof enVal !== "string" || typeof elVal !== "string") return false;
			const enP = (enVal.match(/\{\w+\}/g) || []).sort().join(),
				elP = (elVal.match(/\{\w+\}/g) || []).sort().join();
			return enP !== elP;
		});
		expect(issues).toEqual([]);
	});
});

describe("t()", () => {
	beforeEach(() => i18n.setLocale("en"));

	it("resolves a nested key", () => {
		expect(t("common.save")).toBe("Save");
	});

	it("returns the key when not found", () => {
		expect(t("nonexistent.key")).toBe("nonexistent.key");
	});

	it("returns Greek translation after locale switch", () => {
		i18n.setLocale("el");
		expect(t("common.save")).toBe("Αποθήκευση");
	});

	it("keeps placeholder tokens verbatim when there are no params", () => {
		expect(t("common.deleteConfirm")).toBe("Delete {name}?");
	});

	it("returns the key for a nested object (not a leaf string)", () => {
		expect(t("common")).toBe("common");
	});
});
