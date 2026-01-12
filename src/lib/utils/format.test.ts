import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol, type FormatSettings, type CurrencyCodeType } from "./format";

describe("formatDate", () => {
	const d = new Date("2024-12-25T14:30:00");

	it.each<[FormatSettings | null, string]>([
		[null, "25/12/2024"],
		[{ date_format: "MM/DD/YYYY" }, "12/25/2024"],
		[{ date_format: "YYYY-MM-DD" }, "2024-12-25"],
	])("formats with settings %j → %s", (settings, expected) => {
		expect(formatDate(d, settings, false)).toBe(expected);
	});

	it("includes time when requested", () => {
		expect(formatDate(d, null, true)).toBe("25/12/2024 14:30");
		expect(formatDate(d, { time_format: "12h" }, true)).toBe("25/12/2024 2:30 PM");
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
	it.each<[CurrencyCodeType, string]>([["EUR", "€"], ["USD", "$"], ["GBP", "£"]])("%s → %s", (code, symbol) => {
		expect(getCurrencySymbol(code)).toBe(symbol);
	});
});
