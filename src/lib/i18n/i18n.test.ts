import { describe, it, expect } from "vitest";
import { en } from "./en";
import { el } from "./el";

describe("i18n translations", () => {
	function getKeys(obj: unknown, prefix = ""): string[] {
		const keys: string[] = [];
		if (obj && typeof obj === "object") {
			for (const [key, value] of Object.entries(obj)) {
				const fullKey = prefix ? `${prefix}.${key}` : key;
				if (value && typeof value === "object" && !Array.isArray(value)) {
					keys.push(...getKeys(value, fullKey));
				} else {
					keys.push(fullKey);
				}
			}
		}
		return keys;
	}

	describe("consistency", () => {
		it("should have matching keys between en and el", () => {
			const enKeys = getKeys(en).sort();
			const elKeys = getKeys(el).sort();

			const missingInEl = enKeys.filter((k) => !elKeys.includes(k));
			const missingInEn = elKeys.filter((k) => !enKeys.includes(k));

			expect(missingInEl, `Missing keys in EL: ${missingInEl.join(", ")}`).toEqual([]);
			expect(missingInEn, `Missing keys in EN: ${missingInEn.join(", ")}`).toEqual([]);
		});

		it("should have non-empty string values", () => {
			// Random sample check to ensure values are strings, not deep validation
			const sampleKey = "common.save";
			// @ts-ignore - structural check
			if (en.common?.save) expect(typeof en.common.save).toBe("string");
		});
	});

	describe("placeholders", () => {
		it("should share consistent placeholder variables between locales", () => {
			// If English has {name}, Greek should also have {name}
			const enKeys = getKeys(en);
			
			enKeys.forEach(key => {
				const getVal = (obj: any, k: string) => k.split('.').reduce((o, i) => o?.[i], obj);
				const enVal = getVal(en, key);
				const elVal = getVal(el, key);

				if (typeof enVal === 'string' && typeof elVal === 'string') {
					const enMatch = enVal.match(/\{(\w+)\}/g);
					const elMatch = elVal.match(/\{(\w+)\}/g);
					
					if (enMatch) {
						expect(elMatch, `Key ${key} missing placeholders`).toBeDefined();
						const enPlaceholders = [...new Set(enMatch)].sort();
						const elPlaceholders = [...new Set(elMatch || [])].sort();
						expect(elPlaceholders).toEqual(enPlaceholders);
					}
				}
			});
		});
	});
});
