import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol, tomorrowAt, type FormatSettings, type CurrencyCodeType } from "./format";

describe("formatDate", () => {
	const d = new Date("2024-12-25T14:30:00");

	it.each<[FormatSettings | null, string]>([
		[null, "25/12/2024"],
		[{ date_format: "MM/DD/YYYY" }, "12/25/2024"],
		[{ date_format: "YYYY-MM-DD" }, "2024-12-25"],
		[{ date_format: "DD.MM.YYYY" }, "25.12.2024"],
		[{ date_format: "DD-MM-YYYY" }, "25-12-2024"],
	])("formats with settings %j → %s", (settings, expected) => {
		expect(formatDate(d, settings, false)).toBe(expected);
	});

	it("includes time when requested", () => {
		expect(formatDate(d, null, true)).toBe("25/12/2024 14:30");
		expect(formatDate(d, { time_format: "12h" }, true)).toBe("25/12/2024 2:30 PM");
	});

	it("returns - for invalid date", () => {
		expect(formatDate("not-a-date", null)).toBe("-");
	});

	it("handles midnight correctly in 12h format", () => {
		const midnight = new Date("2024-12-25T00:00:00");
		expect(formatDate(midnight, { time_format: "12h" }, true)).toContain("12:00 AM");
	});
});

describe("formatCurrency", () => {
	it.each<[number, FormatSettings | null, string]>([
		[1234.56, null, "€"],
		[1234.56, { currency_code: "USD" }, "$"],
		[1234.56, { currency_code: "GBP" }, "£"],
	])("formats %d with %j → contains %s", (amount, settings, symbol) => {
		expect(formatCurrency(amount, settings)).toContain(symbol);
	});
});

describe("getCurrencySymbol", () => {
	it.each([
		["EUR", "€"],
		["USD", "$"],
		["GBP", "£"],
		["CHF", "CHF"],
		["PLN", "zł"],
		["CZK", "Kč"],
		["SEK", "kr"],
		["NOK", "kr"],
		["DKK", "kr"],
	] as const)("%s → %s", (code, symbol) => {
		expect(getCurrencySymbol(code)).toBe(symbol);
	});

	it("returns € for unknown code", () => {
		expect(getCurrencySymbol("XYZ" as CurrencyCodeType)).toBe("€");
	});

	it("returns € for undefined", () => {
		expect(getCurrencySymbol()).toBe("€");
	});
});

describe("tomorrowAt", () => {
	it("returns a date approximately 24h in the future", () => {
		const d = tomorrowAt(10);
		const diff = d.getTime() - Date.now();
		expect(diff).toBeGreaterThan(0);
		expect(diff).toBeLessThanOrEqual(86_400_000 + 60_000); // within 1min of 24h
	});

	it("sets the hour correctly", () => {
		const d = tomorrowAt(14);
		expect(d.getHours()).toBe(14);
		expect(d.getMinutes()).toBe(0);
		expect(d.getSeconds()).toBe(0);
	});
});
