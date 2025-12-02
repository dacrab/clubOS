import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol } from "./format";
import type { FormatSettings } from "./format";

describe("formatDate", () => {
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
});
