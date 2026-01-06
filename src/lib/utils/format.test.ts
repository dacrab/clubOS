/**
 * Format Utility Tests
 * Essential tests for date and currency formatting.
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol } from "./format";

describe("formatDate", () => {
	const testDate = new Date("2024-12-25T14:30:00");

	it("formats date as DD/MM/YYYY by default", () => {
		expect(formatDate(testDate, null, false)).toBe("25/12/2024");
	});

	it("formats date as MM/DD/YYYY", () => {
		expect(formatDate(testDate, { date_format: "MM/DD/YYYY" }, false)).toBe("12/25/2024");
	});

	it("formats date as YYYY-MM-DD", () => {
		expect(formatDate(testDate, { date_format: "YYYY-MM-DD" }, false)).toBe("2024-12-25");
	});

	it("handles string date input", () => {
		expect(formatDate("2024-12-25T14:30:00", null, false)).toBe("25/12/2024");
	});

	it("returns '-' for invalid date", () => {
		expect(formatDate("invalid-date", null)).toBe("-");
	});

	it("includes 24h time when requested", () => {
		expect(formatDate(testDate, null, true)).toBe("25/12/2024 14:30");
	});

	it("formats 12h time with AM/PM", () => {
		const morning = new Date("2024-12-25T09:30:00");
		expect(formatDate(morning, { time_format: "12h" }, true)).toBe("25/12/2024 9:30 AM");
		expect(formatDate(testDate, { time_format: "12h" }, true)).toBe("25/12/2024 2:30 PM");
	});

	it("handles midnight and noon in 12h format", () => {
		const midnight = new Date("2024-12-25T00:00:00");
		const noon = new Date("2024-12-25T12:00:00");
		expect(formatDate(midnight, { time_format: "12h" }, true)).toBe("25/12/2024 12:00 AM");
		expect(formatDate(noon, { time_format: "12h" }, true)).toBe("25/12/2024 12:00 PM");
	});

	it("pads single digit days and months", () => {
		const date = new Date("2024-01-05T10:00:00");
		expect(formatDate(date, null, false)).toBe("05/01/2024");
	});
});

describe("formatCurrency", () => {
	it("formats EUR by default", () => {
		const result = formatCurrency(1234.56, null);
		expect(result).toMatch(/1[.,]234[.,]56/);
		expect(result).toContain("€");
	});

	it("formats USD correctly", () => {
		const result = formatCurrency(1234.56, { currency_code: "USD" });
		expect(result).toContain("$");
		expect(result).toMatch(/1,234\.56/);
	});

	it("formats GBP correctly", () => {
		const result = formatCurrency(1234.56, { currency_code: "GBP" });
		expect(result).toContain("£");
	});

	it("handles zero and negative values", () => {
		expect(formatCurrency(0, { currency_code: "EUR" })).toMatch(/0[.,]00.*€|€.*0[.,]00/);
		expect(formatCurrency(-50.25, { currency_code: "EUR" })).toMatch(/-|−/);
	});

	it("rounds to 2 decimal places", () => {
		expect(formatCurrency(10.999, null)).toMatch(/11[.,]00/);
		expect(formatCurrency(10, null)).toMatch(/10[.,]00/);
	});
});

describe("getCurrencySymbol", () => {
	it("returns correct symbols", () => {
		expect(getCurrencySymbol("EUR")).toBe("€");
		expect(getCurrencySymbol("USD")).toBe("$");
		expect(getCurrencySymbol("GBP")).toBe("£");
	});

	it("defaults to € for unknown/undefined", () => {
		expect(getCurrencySymbol(undefined)).toBe("€");
		// @ts-expect-error testing invalid input
		expect(getCurrencySymbol("JPY")).toBe("€");
	});
});
