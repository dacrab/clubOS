export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY";
export type TimeFormatType = "24h" | "12h";
export type CurrencyCodeType = "EUR" | "USD" | "GBP" | "CHF" | "PLN" | "CZK" | "SEK" | "NOK" | "DKK";

export interface TenantSettings {
	// Regional
	currency_code: CurrencyCodeType;
	date_format: DateFormatType;
	time_format: TimeFormatType;
	// Inventory
	low_stock_threshold: number;
	// Sales
	coupons_value: number;
	// Bookings
	football_fields_count: number;
	appointment_buffer_min: number;
	prevent_overlaps: boolean;
	birthday_duration_min: number;
	football_duration_min: number;
	// Booking defaults
	birthday_default_hour: number;
	football_default_hour: number;
	football_default_players: number;
	football_min_players: number;
	football_max_players: number;
}

export const DEFAULT_SETTINGS: TenantSettings = {
	// Regional
	currency_code: "EUR",
	date_format: "DD/MM/YYYY",
	time_format: "24h",
	// Inventory
	low_stock_threshold: 3,
	// Sales
	coupons_value: 2,
	// Bookings
	football_fields_count: 2,
	appointment_buffer_min: 15,
	prevent_overlaps: true,
	birthday_duration_min: 180,
	football_duration_min: 120,
	// Booking defaults
	birthday_default_hour: 15,
	football_default_hour: 18,
	football_default_players: 10,
	football_min_players: 2,
	football_max_players: 22,
};

export function mergeSettings(tenantSettings: Partial<TenantSettings> | null): TenantSettings {
	return { ...DEFAULT_SETTINGS, ...(tenantSettings ?? {}) };
}

export const CURRENCY_OPTIONS = [
	{ value: "EUR", labelKey: "settings.currencies.EUR", symbol: "€" },
	{ value: "USD", labelKey: "settings.currencies.USD", symbol: "$" },
	{ value: "GBP", labelKey: "settings.currencies.GBP", symbol: "£" },
	{ value: "CHF", labelKey: "settings.currencies.CHF", symbol: "CHF" },
	{ value: "PLN", labelKey: "settings.currencies.PLN", symbol: "zł" },
	{ value: "CZK", labelKey: "settings.currencies.CZK", symbol: "Kč" },
	{ value: "SEK", labelKey: "settings.currencies.SEK", symbol: "kr" },
	{ value: "NOK", labelKey: "settings.currencies.NOK", symbol: "kr" },
	{ value: "DKK", labelKey: "settings.currencies.DKK", symbol: "kr" },
] as const;

export const DATE_FORMAT_OPTIONS = [
	{ value: "DD/MM/YYYY", labelKey: "settings.dateFormats.DDMMYYYY" },
	{ value: "MM/DD/YYYY", labelKey: "settings.dateFormats.MMDDYYYY" },
	{ value: "YYYY-MM-DD", labelKey: "settings.dateFormats.YYYYMMDD" },
	{ value: "DD.MM.YYYY", labelKey: "settings.dateFormats.DDMMYYYY_DOT" },
] as const;

export const TIME_FORMAT_OPTIONS = [
	{ value: "24h", labelKey: "settings.timeFormats.24h" },
	{ value: "12h", labelKey: "settings.timeFormats.12h" },
] as const;
