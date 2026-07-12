import { beforeEach, describe, expect, it, vi } from "vitest";

const settingsState = {
	current: { date_format: "DD/MM/YYYY", time_format: "24h", currency_code: "EUR" },
};
vi.mock("$lib/state/settings.svelte", () => ({ settings: settingsState }));

const { currentCurrencySymbol, fmtCurrency, fmtDate, formatDateTimeLocal } = await import(
	"./format"
);

process.env.TZ = "UTC";

const d = new Date("2024-03-15T13:45:00Z");

describe("formatDateTimeLocal", () => {
	it("formats a local date-time string", () => {
		expect(formatDateTimeLocal(d)).toBe("2024-03-15T13:45");
	});

	it("omits time when withTime is false", () => {
		expect(formatDateTimeLocal(d, false)).toBe("2024-03-15");
	});
});

describe("fmtDate", () => {
	beforeEach(() => {
		settingsState.current = { date_format: "DD/MM/YYYY", time_format: "24h", currency_code: "EUR" };
	});

	it("returns - for an invalid date", () => {
		expect(fmtDate("not-a-date")).toBe("-");
	});

	it.each([
		["DD/MM/YYYY", "15/03/2024 13:45"],
		["MM/DD/YYYY", "03/15/2024 13:45"],
		["YYYY-MM-DD", "2024-03-15 13:45"],
		["DD.MM.YYYY", "15.03.2024 13:45"],
		["DD-MM-YYYY", "15-03-2024 13:45"],
	] as const)("formats %s with 24h time", (format, expected) => {
		settingsState.current.date_format = format;
		expect(fmtDate(d)).toBe(expected);
	});

	it("formats 12h time with AM/PM", () => {
		settingsState.current.time_format = "12h";
		expect(fmtDate(d)).toBe("15/03/2024 1:45 PM");
	});

	it("drops the time when includeTime is false", () => {
		settingsState.current.date_format = "YYYY-MM-DD";
		expect(fmtDate(d, false)).toBe("2024-03-15");
	});
});

describe("fmtCurrency", () => {
	beforeEach(() => {
		settingsState.current = { date_format: "DD/MM/YYYY", time_format: "24h", currency_code: "EUR" };
	});

	it("formats with the configured currency symbol", () => {
		const out = fmtCurrency(50);
		expect(out).toContain(currentCurrencySymbol());
		expect(out).toContain("50");
	});

	it("uses the configured currency code for the symbol", () => {
		expect(currentCurrencySymbol()).toBe("€");
		settingsState.current.currency_code = "USD";
		expect(currentCurrencySymbol()).toBe("$");
		expect(fmtCurrency(50)).toContain("$");
	});
});
