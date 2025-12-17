import { describe, it, expect } from "vitest";
import { en } from "./en";
import { el } from "./el";

describe("i18n translations", () => {
	function getKeys(obj: unknown, prefix = ""): string[] {
		const keys: string[] = [];
		if (obj && typeof obj === "object" && obj !== null) {
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

	function getValue(obj: unknown, path: string): unknown {
		return path.split(".").reduce((acc, part) => {
			if (acc && typeof acc === "object" && part in (acc as object)) {
				return (acc as Record<string, unknown>)[part];
			}
			return undefined;
		}, obj);
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

		it("should have non-empty string values for known keys", () => {
			const save = (en as unknown as { common: { save: string } }).common?.save;
			expect(typeof save).toBe("string");
			expect(save.length).toBeGreaterThan(0);
		});
	});

	describe("placeholders", () => {
		it("should share consistent placeholder variables between locales", () => {
			const enKeys = getKeys(en);
			const inconsistencies: string[] = [];

			for (const key of enKeys) {
				const enVal = getValue(en, key);
				const elVal = getValue(el, key);

				if (typeof enVal === "string" && typeof elVal === "string") {
					const enMatch = enVal.match(/\{(\w+)\}/g);
					const elMatch = elVal.match(/\{(\w+)\}/g);

					if (enMatch) {
						const enPlaceholders = [...new Set(enMatch)].sort();
						const elPlaceholders = [...new Set(elMatch || [])].sort();

						if (JSON.stringify(enPlaceholders) !== JSON.stringify(elPlaceholders)) {
							inconsistencies.push(
								`${key}: EN[${enPlaceholders.join(", ")}] != EL[${elPlaceholders.join(", ")}]`
							);
						}
					}
				}
			}

			expect(inconsistencies).toEqual([]);
		});
	});
});
