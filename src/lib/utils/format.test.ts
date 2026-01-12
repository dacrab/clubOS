import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, getCurrencySymbol } from "./format";

describe("formatDate", () => {
	const d = new Date("2024-12-25T14:30:00");

	it.each([
		[null, "25/12/2024"],
		[{ date_format: "MM/DD/YYYY" }, "12/25/2024"],
		[{ date_format: "YYYY-MM-DD" }, "2024-12-25"],
	])("formats with settings %j → %s", (settings, expected) => {
		expect(formatDate(d, settings, false)).toBe(expected);
	});

	it("handles string input and invalid dates", () => {
		expect(formatDate("2024-12-25T14:30:00", null, false)).toBe("25/12/2024");
		expect(formatDate("invalid", null)).toBe("-");
	});

	it("includes time when requested", () => {
		expect(formatDate(d, null, true)).toBe("25/12/2024 14:30");
		expect(formatDate(d, { time_format: "12h" }, true)).toBe("25/12/2024 2:30 PM");
	});

	it("handles midnight/noon in 12h format", () => {
		expect(formatDate(new Date("2024-12-25T00:00:00"), { time_format: "12h" }, true)).toBe("25/12/2024 12:00 AM");
		expect(formatDate(new Date("2024-12-25T12:00:00"), { time_format: "12h" }, true)).toBe("25/12/2024 12:00 PM");
	});
});

describe("formatCurrency", () => {
	it.each([
		[1234.56, null, "€", /1[.,]234[.,]56/],
		[1234.56, { currency_code: "USD" }, "$", /1,234\.56/],
		[1234.56, { currency_code: "GBP" }, "£", /1,234\.56/],
	])("formats %d with %j → contains %s", (amount, settings, symbol, pattern) => {
		const result = formatCurrency(amount, settings);
		expect(result).toContain(symbol);
		expect(result).toMatch(pattern);
	});

	it("handles zero and negative", () => {
		expect(formatCurrency(0, { currency_code: "EUR" })).toMatch(/0[.,]00.*€|€.*0[.,]00/);
		expect(formatCurrency(-50.25, { currency_code: "EUR" })).toMatch(/-|−/);
	});
});

describe("getCurrencySymbol", () => {
	it.each([["EUR", "€"], ["USD", "$"], ["GBP", "£"], [undefined, "€"]])("%s → %s", (code, symbol) => {
		expect(getCurrencySymbol(code)).toBe(symbol);
	});
});
