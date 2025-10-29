import { writable } from "svelte/store";
import { supabase } from "$lib/supabase-client";

export type TenantSettings = {
	lowStockThreshold: number;
	allowUnlimitedStock: boolean;
	negativeStockAllowed: boolean;
	defaultCategorySort: "name" | "custom";
	productsPageSize: number;
	imageMaxSizeMb: number;
	couponsValue: number;
	allowTreats: boolean;
	requireOpenRegisterForSale: boolean;
	currencyCode: string;
	taxRatePercent: number;
	receiptFooterText: string | null;
	bookingDefaultDurationMin: number;
	footballFieldsCount: number;
	appointmentBufferMin: number;
	preventOverlaps: boolean;
	themeDefault: "system" | "light" | "dark";
	defaultLocale: "en" | "el";
};

export type UserPreferences = {
	collapsedSidebar: boolean;
	denseTableMode: boolean;
	defaultLocale?: "en" | "el";
	theme?: "system" | "light" | "dark";
};

export type MergedSettings = {
	tenant: TenantSettings;
	user: UserPreferences;
};

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
	lowStockThreshold: 3,
	allowUnlimitedStock: true,
	negativeStockAllowed: false,
	defaultCategorySort: "name",
	productsPageSize: 50,
	imageMaxSizeMb: 5,
	couponsValue: 2,
	allowTreats: true,
	requireOpenRegisterForSale: true,
	currencyCode: "EUR",
	taxRatePercent: 0,
	receiptFooterText: null,
	bookingDefaultDurationMin: 60,
	footballFieldsCount: 2,
	appointmentBufferMin: 15,
	preventOverlaps: true,
	themeDefault: "system",
	defaultLocale: "en",
};

const DEFAULT_USER_PREFS: UserPreferences = {
	collapsedSidebar: false,
	denseTableMode: false,
};

export const settingsStore = writable<MergedSettings>({
	tenant: DEFAULT_TENANT_SETTINGS,
	user: DEFAULT_USER_PREFS,
});

export async function loadSettings(): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id ?? "";
	if (!uid) {
		return;
	}
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid);
	const tenantId = memberships?.[0]?.tenant_id;

	type Row<T> = { data: T | null };
	type DbTenantSettingsRow = {
		lowStockThreshold: number;
		allowUnlimitedStock: boolean;
		negativeStockAllowed: boolean;
		defaultCategorySort: "name" | "custom";
		productsPageSize: number;
		imageMaxSizeMb: number;
		couponsValue: number;
		allowTreats: boolean;
		requireOpenRegisterForSale: boolean;
		currencyCode: string;
		taxRatePercent: number;
		receiptFooterText: string | null;
		bookingDefaultDurationMin: number;
		footballFieldsCount: number;
		appointmentBufferMin: number;
		preventOverlaps: boolean;
		themeDefault: "system" | "light" | "dark";
		defaultLocale: "en" | "el";
	};
	type DbUserPreferencesRow = {
		collapsedSidebar: boolean;
		denseTableMode: boolean;
		defaultLocale?: "en" | "el" | null;
		theme?: "system" | "light" | "dark" | null;
	};

	const tRowPromise = tenantId
		? supabase
				.from("tenant_settings")
				.select(
					"lowStockThreshold:low_stock_threshold,allowUnlimitedStock:allow_unlimited_stock,negativeStockAllowed:negative_stock_allowed,defaultCategorySort:default_category_sort,productsPageSize:products_page_size,imageMaxSizeMb:image_max_size_mb,couponsValue:coupons_value,allowTreats:allow_treats,requireOpenRegisterForSale:require_open_register_for_sale,currencyCode:currency_code,taxRatePercent:tax_rate_percent,receiptFooterText:receipt_footer_text,bookingDefaultDurationMin:booking_default_duration_min,footballFieldsCount:football_fields_count,appointmentBufferMin:appointment_buffer_min,preventOverlaps:prevent_overlaps,themeDefault:theme_default,defaultLocale:default_locale",
				)
				.eq("tenant_id", tenantId)
				.is("facility_id", null)
				.limit(1)
				.maybeSingle()
		: Promise.resolve<Row<Partial<DbTenantSettingsRow>>>({ data: null });
	const uRowPromise = supabase
		.from("user_preferences")
		.select(
			"collapsedSidebar:collapsed_sidebar,denseTableMode:dense_table_mode,defaultLocale:default_locale,theme",
		)
		.eq("user_id", uid)
		.maybeSingle();

	const [tenantRow, userRow] = (await Promise.all([
		tRowPromise,
		uRowPromise,
	])) as [Row<Partial<DbTenantSettingsRow>>, Row<DbUserPreferencesRow>];

	function mapTenantSettings(
		row: Partial<DbTenantSettingsRow> | null,
	): Partial<TenantSettings> {
		if (!row) {
			return {};
		}
		return row as Partial<TenantSettings>;
	}

	function mapUserPreferences(
		row: Partial<DbUserPreferencesRow> | null,
	): Partial<UserPreferences> {
		if (!row) {
			return {};
		}
		const mapped: Partial<UserPreferences> = {};
		if (row.collapsedSidebar !== undefined) {
			mapped.collapsedSidebar = row.collapsedSidebar;
		}
		if (row.denseTableMode !== undefined) {
			mapped.denseTableMode = row.denseTableMode;
		}
		if (row.defaultLocale !== undefined && row.defaultLocale !== null) {
			mapped.defaultLocale = row.defaultLocale;
		}
		if (row.theme !== undefined && row.theme !== null) {
			mapped.theme = row.theme;
		}
		return mapped;
	}

	const tenantSettings = {
		...DEFAULT_TENANT_SETTINGS,
		...mapTenantSettings(tenantRow?.data ?? null),
	} as TenantSettings;
	const userPreferences = {
		...DEFAULT_USER_PREFS,
		...mapUserPreferences(userRow?.data ?? null),
	} as UserPreferences;

	settingsStore.set({ tenant: tenantSettings, user: userPreferences });
}

export function getInventorySettings(s: MergedSettings = getSnapshot()): {
	lowStockThreshold: number;
	allowUnlimitedStock: boolean;
	negativeStockAllowed: boolean;
} {
	return {
		lowStockThreshold: s.tenant.lowStockThreshold,
		allowUnlimitedStock: s.tenant.allowUnlimitedStock,
		negativeStockAllowed: s.tenant.negativeStockAllowed,
	};
}

function getSnapshot(): MergedSettings {
	let snap: MergedSettings;
	settingsStore.subscribe((v) => {
		snap = v;
	})();
	// @ts-expect-error initialize by subscription
	return snap;
}
