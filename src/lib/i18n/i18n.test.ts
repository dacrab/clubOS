import { describe, it, expect } from "vitest";
import { en } from "./en";
import { el } from "./el";

const getKeys = (obj: unknown, prefix = ""): string[] => {
	if (!obj || typeof obj !== "object") return [];
	return Object.entries(obj).flatMap(([k, v]) => {
		const key = prefix ? `${prefix}.${k}` : k;
		return typeof v === "object" && !Array.isArray(v) ? getKeys(v, key) : [key];
	});
};

const getValue = (obj: unknown, path: string) => path.split(".").reduce((a: unknown, p) => (a as Record<string, unknown>)?.[p], obj);

describe("i18n", () => {
	it("en and el have matching keys", () => {
		const enKeys = getKeys(en).sort(), elKeys = getKeys(el).sort();
		expect(enKeys.filter(k => !elKeys.includes(k))).toEqual([]);
		expect(elKeys.filter(k => !enKeys.includes(k))).toEqual([]);
	});

	it("placeholders match between locales", () => {
		const issues = getKeys(en).filter(key => {
			const enVal = getValue(en, key), elVal = getValue(el, key);
			if (typeof enVal !== "string" || typeof elVal !== "string") return false;
			const enP = (enVal.match(/\{\w+\}/g) || []).sort().join(), elP = (elVal.match(/\{\w+\}/g) || []).sort().join();
			return enP !== elP;
		});
		expect(issues).toEqual([]);
	});
});
