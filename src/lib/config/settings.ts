/**
 * Centralized settings configuration
 * Single source of truth for default settings and types
 */

import type { DateFormatType, TimeFormatType, CurrencyCodeType } from "$lib/utils/format";

export interface TenantSettings {
	// Regional
	currency_code: CurrencyCodeType;
	date_format: DateFormatType;
	time_format: TimeFormatType;
	// Inventory
	low_stock_threshold: number;
	allow_unlimited_stock: boolean;
	negative_stock_allowed: boolean;
	// Sales
	coupons_value: number;
	allow_treats: boolean;
	require_open_register_for_sale: boolean;
	tax_rate_percent: number;
	// Bookings
	football_fields_count: number;
	appointment_buffer_min: number;
	booking_default_duration_min: number;
	prevent_overlaps: boolean;
	birthday_duration_min: number;
	football_duration_min: number;
}

export const DEFAULT_SETTINGS: TenantSettings = {
	// Regional
	currency_code: "EUR",
	date_format: "DD/MM/YYYY",
	time_format: "24h",
	// Inventory
	low_stock_threshold: 3,
	allow_unlimited_stock: true,
	negative_stock_allowed: false,
	// Sales
	coupons_value: 2,
	allow_treats: true,
	require_open_register_for_sale: true,
	tax_rate_percent: 0,
	// Bookings
	football_fields_count: 2,
	appointment_buffer_min: 15,
	booking_default_duration_min: 120,
	prevent_overlaps: true,
	birthday_duration_min: 180,
	football_duration_min: 120,
};

/** Merge tenant settings with defaults */
export function mergeSettings(tenantSettings: Partial<TenantSettings> | null): TenantSettings {
	return { ...DEFAULT_SETTINGS, ...(tenantSettings ?? {}) };
}

/** Currency options - can be extended */
export const CURRENCY_OPTIONS = [
	{ value: "EUR", label: "Euro (EUR)", symbol: "€" },
	{ value: "USD", label: "US Dollar (USD)", symbol: "$" },
	{ value: "GBP", label: "British Pound (GBP)", symbol: "£" },
	{ value: "CHF", label: "Swiss Franc (CHF)", symbol: "CHF" },
	{ value: "PLN", label: "Polish Zloty (PLN)", symbol: "zł" },
	{ value: "CZK", label: "Czech Koruna (CZK)", symbol: "Kč" },
	{ value: "SEK", label: "Swedish Krona (SEK)", symbol: "kr" },
	{ value: "NOK", label: "Norwegian Krone (NOK)", symbol: "kr" },
	{ value: "DKK", label: "Danish Krone (DKK)", symbol: "kr" },
] as const;

export const DATE_FORMAT_OPTIONS = [
	{ value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
	{ value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
	{ value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
	{ value: "DD.MM.YYYY", label: "DD.MM.YYYY (31.12.2024)" },
] as const;

export const TIME_FORMAT_OPTIONS = [
	{ value: "24h", labelKey: "settings.timeFormats.24h" },
	{ value: "12h", labelKey: "settings.timeFormats.12h" },
] as const;
