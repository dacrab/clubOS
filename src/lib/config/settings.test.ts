import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings";

describe("mergeSettings", () => {
	it("returns defaults when input is null", () => {
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it("returns defaults when input is undefined", () => {
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it("merges partial overrides", () => {
		const result = mergeSettings({ currency_code: "USD", low_stock_threshold: 10 });
		expect(result.currency_code).toBe("USD");
		expect(result.low_stock_threshold).toBe(10);
		expect(result.date_format).toBe("DD/MM/YYYY");
		expect(result.time_format).toBe("24h");
	});

	it("overrides nested defaults", () => {
		const result = mergeSettings({
			currency_code: "GBP",
			date_format: "YYYY-MM-DD",
			time_format: "12h",
			low_stock_threshold: 5,
			coupons_value: 3,
			football_fields_count: 4,
			appointment_buffer_min: 30,
			prevent_overlaps: false,
			birthday_duration_min: 120,
			football_duration_min: 90,
		});
		expect(result).toEqual({
			currency_code: "GBP",
			date_format: "YYYY-MM-DD",
			time_format: "12h",
			low_stock_threshold: 5,
			coupons_value: 3,
			football_fields_count: 4,
			appointment_buffer_min: 30,
			prevent_overlaps: false,
			birthday_duration_min: 120,
			football_duration_min: 90,
		});
	});
});

describe("DEFAULT_SETTINGS", () => {
	it("has all required fields", () => {
		expect(DEFAULT_SETTINGS).toMatchObject({
			currency_code: expect.any(String),
			date_format: expect.any(String),
			time_format: expect.any(String),
			low_stock_threshold: expect.any(Number),
			coupons_value: expect.any(Number),
			football_fields_count: expect.any(Number),
			appointment_buffer_min: expect.any(Number),
			prevent_overlaps: expect.any(Boolean),
			birthday_duration_min: expect.any(Number),
			football_duration_min: expect.any(Number),
		});
	});
});
