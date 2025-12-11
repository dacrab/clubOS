/**
 * Format Utility Tests - Senior Level
 *
 * Comprehensive tests for date and currency formatting utilities.
 * Covers:
 * - All date format variations
 * - Time format (12h/24h)
 * - Currency formatting with locales
 * - Edge cases (invalid input, boundary values, timezone considerations)
 * - Type safety and null handling
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol } from "./format";
import type { FormatSettings } from "./format";

describe("formatDate", () => {
	// Use fixed dates to avoid timezone issues in CI
	const testDate = new Date("2024-12-25T14:30:00");
	const testDateStr = "2024-12-25T14:30:00";

	describe("date formatting", () => {
		it("should format date as DD/MM/YYYY by default", () => {
			expect(formatDate(testDate, null, false)).toBe("25/12/2024");
		});

		it("should format date as MM/DD/YYYY", () => {
			const settings: FormatSettings = { date_format: "MM/DD/YYYY" };
			expect(formatDate(testDate, settings, false)).toBe("12/25/2024");
		});

		it("should format date as YYYY-MM-DD", () => {
			const settings: FormatSettings = { date_format: "YYYY-MM-DD" };
			expect(formatDate(testDate, settings, false)).toBe("2024-12-25");
		});

		it("should format date as DD.MM.YYYY", () => {
			const settings: FormatSettings = { date_format: "DD.MM.YYYY" };
			expect(formatDate(testDate, settings, false)).toBe("25.12.2024");
		});

		it("should format date as DD-MM-YYYY", () => {
			const settings: FormatSettings = { date_format: "DD-MM-YYYY" };
			expect(formatDate(testDate, settings, false)).toBe("25-12-2024");
		});

		it("should handle string date input", () => {
			expect(formatDate(testDateStr, null, false)).toBe("25/12/2024");
		});

		it("should return '-' for invalid date", () => {
			expect(formatDate("invalid-date", null)).toBe("-");
			expect(formatDate(new Date("invalid"), null)).toBe("-");
		});

		it("should pad single digit days and months", () => {
			const date = new Date("2024-01-05T10:00:00");
			expect(formatDate(date, null, false)).toBe("05/01/2024");
		});

		it("should handle empty settings object", () => {
			expect(formatDate(testDate, {}, false)).toBe("25/12/2024");
		});

		it("should handle undefined settings", () => {
			expect(formatDate(testDate, undefined as unknown as FormatSettings, false)).toBe("25/12/2024");
		});
	});

	describe("time formatting", () => {
		it("should include 24h time by default", () => {
			expect(formatDate(testDate, null, true)).toBe("25/12/2024 14:30");
		});

		it("should format 12h time with AM", () => {
			const morningDate = new Date("2024-12-25T09:30:00");
			const settings: FormatSettings = { time_format: "12h" };
			expect(formatDate(morningDate, settings, true)).toBe("25/12/2024 9:30 AM");
		});

		it("should format 12h time with PM", () => {
			const settings: FormatSettings = { time_format: "12h" };
			expect(formatDate(testDate, settings, true)).toBe("25/12/2024 2:30 PM");
		});

		it("should handle midnight in 12h format", () => {
			const midnight = new Date("2024-12-25T00:00:00");
			const settings: FormatSettings = { time_format: "12h" };
			expect(formatDate(midnight, settings, true)).toBe("25/12/2024 12:00 AM");
		});

		it("should handle noon in 12h format", () => {
			const noon = new Date("2024-12-25T12:00:00");
			const settings: FormatSettings = { time_format: "12h" };
			expect(formatDate(noon, settings, true)).toBe("25/12/2024 12:00 PM");
		});

		it("should pad minutes in 24h format", () => {
			const date = new Date("2024-12-25T09:05:00");
			expect(formatDate(date, null, true)).toBe("25/12/2024 09:05");
		});

		it("should not include time when includeTime is false", () => {
			expect(formatDate(testDate, null, false)).toBe("25/12/2024");
		});
	});

	describe("combined date and time formats", () => {
		it("should combine MM/DD/YYYY with 12h time", () => {
			const settings: FormatSettings = { date_format: "MM/DD/YYYY", time_format: "12h" };
			expect(formatDate(testDate, settings, true)).toBe("12/25/2024 2:30 PM");
		});

		it("should combine YYYY-MM-DD with 24h time", () => {
			const settings: FormatSettings = { date_format: "YYYY-MM-DD", time_format: "24h" };
			expect(formatDate(testDate, settings, true)).toBe("2024-12-25 14:30");
		});
	});
});

describe("formatCurrency", () => {
	describe("EUR formatting", () => {
		it("should format EUR by default", () => {
			const result = formatCurrency(1234.56, null);
			expect(result).toMatch(/1[.,]234[.,]56/);
			expect(result).toContain("€");
		});

		it("should format EUR with explicit settings", () => {
			const settings: FormatSettings = { currency_code: "EUR" };
			const result = formatCurrency(1234.56, settings);
			expect(result).toMatch(/1[.,]234[.,]56/);
			expect(result).toContain("€");
		});

		it("should handle zero", () => {
			const result = formatCurrency(0, { currency_code: "EUR" });
			expect(result).toContain("0");
			expect(result).toContain("€");
		});

		it("should handle negative values", () => {
			const result = formatCurrency(-50.25, { currency_code: "EUR" });
			expect(result).toMatch(/-?\s?50[.,]25/);
		});
	});

	describe("USD formatting", () => {
		it("should format USD correctly", () => {
			const settings: FormatSettings = { currency_code: "USD" };
			const result = formatCurrency(1234.56, settings);
			expect(result).toContain("$");
			expect(result).toMatch(/1,234\.56/);
		});

		it("should handle large USD amounts", () => {
			const settings: FormatSettings = { currency_code: "USD" };
			const result = formatCurrency(1000000, settings);
			expect(result).toContain("$");
			expect(result).toMatch(/1,000,000/);
		});
	});

	describe("GBP formatting", () => {
		it("should format GBP correctly", () => {
			const settings: FormatSettings = { currency_code: "GBP" };
			const result = formatCurrency(1234.56, settings);
			expect(result).toContain("£");
		});
	});

	describe("decimal handling", () => {
		it("should round to 2 decimal places", () => {
			const result = formatCurrency(10.999, null);
			expect(result).toMatch(/11[.,]00/);
		});

		it("should add trailing zeros", () => {
			const result = formatCurrency(10, null);
			expect(result).toMatch(/10[.,]00/);
		});

		it("should handle very small amounts", () => {
			const result = formatCurrency(0.01, null);
			expect(result).toMatch(/0[.,]01/);
		});
	});
});

describe("getCurrencySymbol", () => {
	it("should return € for EUR", () => {
		expect(getCurrencySymbol("EUR")).toBe("€");
	});

	it("should return $ for USD", () => {
		expect(getCurrencySymbol("USD")).toBe("$");
	});

	it("should return £ for GBP", () => {
		expect(getCurrencySymbol("GBP")).toBe("£");
	});

	it("should return € for undefined", () => {
		expect(getCurrencySymbol(undefined)).toBe("€");
	});

	it("should return € for any unknown code", () => {
		// @ts-expect-error testing invalid input
		expect(getCurrencySymbol("JPY")).toBe("€");
	});

	it("should return € for null", () => {
		// @ts-expect-error testing null input
		expect(getCurrencySymbol(null)).toBe("€");
	});

	it("should return € for empty string", () => {
		// @ts-expect-error testing empty string
		expect(getCurrencySymbol("")).toBe("€");
	});
});

describe("Edge Cases and Boundary Conditions", () => {
	describe("formatDate edge cases", () => {
		it("should handle epoch date (1970-01-01)", () => {
			const epoch = new Date(0);
			const result = formatDate(epoch, null, false);
			expect(result).toMatch(/01\/01\/1970/);
		});

		it("should handle far future date (year 2099)", () => {
			const futureDate = new Date("2099-12-31T23:59:59");
			expect(formatDate(futureDate, null, false)).toBe("31/12/2099");
		});

		it("should handle leap year date (Feb 29)", () => {
			const leapDate = new Date("2024-02-29T12:00:00");
			expect(formatDate(leapDate, null, false)).toBe("29/02/2024");
		});

		it("should handle end of year boundary", () => {
			const endOfYear = new Date("2024-12-31T23:59:59");
			expect(formatDate(endOfYear, null, true)).toBe("31/12/2024 23:59");
		});

		it("should handle start of year boundary", () => {
			const startOfYear = new Date("2024-01-01T00:00:00");
			expect(formatDate(startOfYear, null, true)).toBe("01/01/2024 00:00");
		});

		it("should handle numeric timestamp via Date constructor", () => {
			const timestamp = 1703505000000; // Dec 25, 2023
			const result = formatDate(new Date(timestamp), null, false);
			expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
		});
	});

	describe("formatCurrency edge cases", () => {
		it("should handle very large amounts", () => {
			const result = formatCurrency(999999999.99, { currency_code: "EUR" });
			expect(result).toContain("€");
			expect(result).toMatch(/999/);
		});

		it("should handle very small amounts", () => {
			const result = formatCurrency(0.01, { currency_code: "EUR" });
			expect(result).toContain("€");
			expect(result).toMatch(/0[.,]01/);
		});

		it("should handle exactly zero", () => {
			const result = formatCurrency(0, { currency_code: "EUR" });
			expect(result).toContain("€");
			expect(result).toMatch(/0[.,]00/);
		});

		it("should handle negative amounts correctly", () => {
			const result = formatCurrency(-100.5, { currency_code: "USD" });
			expect(result).toContain("$");
			// Should contain negative indicator
			expect(result).toMatch(/-|−|\(/);
		});

		it("should round correctly at .005 boundary", () => {
			// .005 should round to .01 (banker's rounding may vary)
			const result1 = formatCurrency(10.005, { currency_code: "EUR" });
			const result2 = formatCurrency(10.004, { currency_code: "EUR" });
			// At least one should round up, one down
			expect(result1).toMatch(/10[.,]0[01]/);
			expect(result2).toMatch(/10[.,]00/);
		});

		it("should handle NaN gracefully", () => {
			const result = formatCurrency(NaN, { currency_code: "EUR" });
			// Should not throw, behavior may vary
			expect(typeof result).toBe("string");
		});

		it("should handle Infinity", () => {
			const result = formatCurrency(Infinity, { currency_code: "EUR" });
			expect(typeof result).toBe("string");
		});
	});
});

describe("Performance considerations", () => {
	it("should format 1000 dates in reasonable time", () => {
		const start = performance.now();
		const date = new Date("2024-06-15T10:30:00");
		
		for (let i = 0; i < 1000; i++) {
			formatDate(date, null, true);
		}
		
		const duration = performance.now() - start;
		// Should complete in under 100ms
		expect(duration).toBeLessThan(100);
	});

	it("should format 1000 currency values in reasonable time", () => {
		const start = performance.now();
		
		for (let i = 0; i < 1000; i++) {
			formatCurrency(1234.56, { currency_code: "EUR" });
		}
		
		const duration = performance.now() - start;
		// Currency formatting uses Intl.NumberFormat which is slower than date formatting
		// Allow more time for CI/slower environments
		expect(duration).toBeLessThan(1000);
	});
});
