import { writable } from "svelte/store";
import { supabase } from "$lib/supabaseClient";

export type TenantSettings = {
  // biome-ignore lint/style/useNamingConvention: DB column names
  low_stock_threshold: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  allow_unlimited_stock: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  negative_stock_allowed: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  default_category_sort: "name" | "custom";
  // biome-ignore lint/style/useNamingConvention: DB column names
  products_page_size: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  image_max_size_mb: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  coupons_value: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  allow_treats: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  require_open_register_for_sale: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  currency_code: string;
  // biome-ignore lint/style/useNamingConvention: DB column names
  tax_rate_percent: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  receipt_footer_text: string | null;
  // biome-ignore lint/style/useNamingConvention: DB column names
  booking_default_duration_min: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  football_fields_count: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  appointment_buffer_min: number;
  // biome-ignore lint/style/useNamingConvention: DB column names
  prevent_overlaps: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  theme_default: "system" | "light" | "dark";
  // biome-ignore lint/style/useNamingConvention: DB column names
  default_locale: "en" | "el";
};

export type UserPreferences = {
  // biome-ignore lint/style/useNamingConvention: DB column names
  collapsed_sidebar: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  dense_table_mode: boolean;
  // biome-ignore lint/style/useNamingConvention: DB column names
  default_locale?: "en" | "el";
  theme?: "system" | "light" | "dark";
};

export type MergedSettings = {
  tenant: TenantSettings;
  user: UserPreferences;
};

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  // biome-ignore lint/style/useNamingConvention: DB column names
  low_stock_threshold: 3,
  // biome-ignore lint/style/useNamingConvention: DB column names
  allow_unlimited_stock: true,
  // biome-ignore lint/style/useNamingConvention: DB column names
  negative_stock_allowed: false,
  // biome-ignore lint/style/useNamingConvention: DB column names
  default_category_sort: "name",
  // biome-ignore lint/style/useNamingConvention: DB column names
  products_page_size: 50,
  // biome-ignore lint/style/useNamingConvention: DB column names
  image_max_size_mb: 5,
  // biome-ignore lint/style/useNamingConvention: DB column names
  coupons_value: 2,
  // biome-ignore lint/style/useNamingConvention: DB column names
  allow_treats: true,
  // biome-ignore lint/style/useNamingConvention: DB column names
  require_open_register_for_sale: true,
  // biome-ignore lint/style/useNamingConvention: DB column names
  currency_code: "EUR",
  // biome-ignore lint/style/useNamingConvention: DB column names
  tax_rate_percent: 0,
  // biome-ignore lint/style/useNamingConvention: DB column names
  receipt_footer_text: null,
  // biome-ignore lint/style/useNamingConvention: DB column names
  booking_default_duration_min: 60,
  // biome-ignore lint/style/useNamingConvention: DB column names
  football_fields_count: 2,
  // biome-ignore lint/style/useNamingConvention: DB column names
  appointment_buffer_min: 15,
  // biome-ignore lint/style/useNamingConvention: DB column names
  prevent_overlaps: true,
  // biome-ignore lint/style/useNamingConvention: DB column names
  theme_default: "system",
  // biome-ignore lint/style/useNamingConvention: DB column names
  default_locale: "en",
};

const DEFAULT_USER_PREFS: UserPreferences = {
  // biome-ignore lint/style/useNamingConvention: DB column names
  collapsed_sidebar: false,
  // biome-ignore lint/style/useNamingConvention: DB column names
  dense_table_mode: false,
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
  const [tenantRow, userRow] = await Promise.all([
    tenantId
      ? supabase
          .from("tenant_settings")
          .select(
            "low_stock_threshold,allow_unlimited_stock,negative_stock_allowed,default_category_sort,products_page_size,image_max_size_mb,coupons_value,allow_treats,require_open_register_for_sale,currency_code,tax_rate_percent,receipt_footer_text,booking_default_duration_min,football_fields_count,appointment_buffer_min,prevent_overlaps,theme_default,default_locale"
          )
          .eq("tenant_id", tenantId)
          .limit(1)
          .maybeSingle()
      : Promise.resolve<Row<Partial<TenantSettings>>>({ data: null }),
    supabase
      .from("user_preferences")
      .select("collapsed_sidebar,dense_table_mode,default_locale,theme")
      .eq("user_id", uid)
      .maybeSingle(),
  ]);

  const tenantSettings = {
    ...DEFAULT_TENANT_SETTINGS,
    ...(tenantRow?.data ?? {}),
  } as TenantSettings;
  const userPreferences = {
    ...DEFAULT_USER_PREFS,
    ...(userRow?.data ?? {}),
  } as UserPreferences;

  settingsStore.set({ tenant: tenantSettings, user: userPreferences });
}

export function getInventorySettings(s: MergedSettings = getSnapshot()): {
  // biome-ignore lint/style/useNamingConvention: mirrors DB column names
  low_stock_threshold: number;
  // biome-ignore lint/style/useNamingConvention: mirrors DB column names
  allow_unlimited_stock: boolean;
  // biome-ignore lint/style/useNamingConvention: mirrors DB column names
  negative_stock_allowed: boolean;
} {
  return {
    // biome-ignore lint/style/useNamingConvention: mirrors DB column names
    low_stock_threshold: s.tenant.low_stock_threshold,
    // biome-ignore lint/style/useNamingConvention: mirrors DB column names
    allow_unlimited_stock: s.tenant.allow_unlimited_stock,
    // biome-ignore lint/style/useNamingConvention: mirrors DB column names
    negative_stock_allowed: s.tenant.negative_stock_allowed,
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
