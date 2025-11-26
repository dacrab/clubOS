import type { FormatSettings } from "$lib/utils/format";

export interface TenantSettings extends FormatSettings {
	id?: string;
	tenant_id?: string;
	facility_id?: string | null;
	// Inventory
	low_stock_threshold: number;
	allow_unlimited_stock: boolean;
	negative_stock_allowed: boolean;
	default_category_sort: string;
	products_page_size: number;
	// Sales
	coupons_value: number;
	allow_treats: boolean;
	require_open_register_for_sale: boolean;
	tax_rate_percent: number;
	// Bookings
	booking_default_duration_min: number;
	football_fields_count: number;
	appointment_buffer_min: number;
	prevent_overlaps: boolean;
}

const defaultSettings: TenantSettings = {
	low_stock_threshold: 3,
	allow_unlimited_stock: true,
	negative_stock_allowed: false,
	default_category_sort: "name",
	products_page_size: 50,
	coupons_value: 2,
	allow_treats: true,
	require_open_register_for_sale: true,
	currency_code: "EUR",
	tax_rate_percent: 0,
	date_format: "DD/MM/YYYY",
	time_format: "24h",
	booking_default_duration_min: 120,
	football_fields_count: 2,
	appointment_buffer_min: 15,
	prevent_overlaps: true,
};

class SettingsState {
	current = $state<TenantSettings>(defaultSettings);

	setSettings(newSettings: Partial<TenantSettings>): void {
		this.current = { ...defaultSettings, ...newSettings };
	}

	get formatSettings(): FormatSettings {
		return {
			date_format: this.current.date_format,
			time_format: this.current.time_format,
			currency_code: this.current.currency_code,
		};
	}
}

export const settings = new SettingsState();
