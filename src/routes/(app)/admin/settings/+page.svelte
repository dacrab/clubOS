<script lang="ts">
import { afterNavigate } from "$app/navigation";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
import { Switch } from "$lib/components/ui/switch";
import { Textarea } from "$lib/components/ui/textarea";
import { t } from "$lib/state/i18n.svelte";
import type { TenantSettings } from "$lib/state/settings.svelte";
import { settingsState } from "$lib/state/settings.svelte";
import { supabase } from "$lib/utils/supabase";

let saving = $state(false);

let form = $state<TenantSettings>({
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
});

let receiptFooterText = $state("");

$effect(() => {
	form = { ...settingsState.value.tenant };
	receiptFooterText = settingsState.value.tenant.receiptFooterText ?? "";
});

$effect(() => {
	settingsState.load();
	afterNavigate(() => {
		if (typeof window !== "undefined" && window.location.pathname === "/admin/settings") {
			settingsState.load();
		}
	});
});

async function upsertTenantSettings(partial: Partial<TenantSettings>) {
	saving = true;
	try {
		const { data: sessionData } = await supabase.auth.getUser();
		const uid = sessionData.user?.id ?? "";
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", uid);
		const tenantId = memberships?.[0]?.tenant_id;
		if (!tenantId) return;

		const KEY_MAP: Record<keyof TenantSettings, string> = {
			lowStockThreshold: "low_stock_threshold",
			allowUnlimitedStock: "allow_unlimited_stock",
			negativeStockAllowed: "negative_stock_allowed",
			defaultCategorySort: "default_category_sort",
			productsPageSize: "products_page_size",
			imageMaxSizeMb: "image_max_size_mb",
			couponsValue: "coupons_value",
			allowTreats: "allow_treats",
			requireOpenRegisterForSale: "require_open_register_for_sale",
			currencyCode: "currency_code",
			taxRatePercent: "tax_rate_percent",
			receiptFooterText: "receipt_footer_text",
			bookingDefaultDurationMin: "booking_default_duration_min",
			footballFieldsCount: "football_fields_count",
			appointmentBufferMin: "appointment_buffer_min",
			preventOverlaps: "prevent_overlaps",
			themeDefault: "theme_default",
			defaultLocale: "default_locale",
		};

		const payload: Record<string, unknown> = {
			tenant_id: tenantId,
			facility_id: null,
		};
		for (const [k, v] of Object.entries(partial) as Array<[keyof TenantSettings, unknown]>) {
			if (v !== undefined) payload[KEY_MAP[k]] = v;
		}

		const { data: existing } = await supabase
			.from("tenant_settings")
			.select("id")
			.eq("tenant_id", tenantId)
			.is("facility_id", null)
			.maybeSingle();

		let error: { message: string } | null = null;
		if (existing?.id) {
			({ error } = await supabase.from("tenant_settings").update(payload).eq("id", existing.id));
		} else {
			({ error } = await supabase.from("tenant_settings").insert(payload));
		}

		const { toast } = await import("svelte-sonner");
		if (!error) {
			settingsState.load();
			toast.success(t("common.save"));
		} else {
			toast.error(error.message);
		}
	} finally {
		saving = false;
	}
}

async function saveAll() {
	await upsertTenantSettings({
		lowStockThreshold: Number(form.lowStockThreshold),
		allowUnlimitedStock: form.allowUnlimitedStock,
		negativeStockAllowed: form.negativeStockAllowed,
		defaultCategorySort: form.defaultCategorySort,
		productsPageSize: Number(form.productsPageSize),
		imageMaxSizeMb: Number(form.imageMaxSizeMb),
		couponsValue: Number(form.couponsValue),
		allowTreats: form.allowTreats,
		requireOpenRegisterForSale: form.requireOpenRegisterForSale,
		currencyCode: (form.currencyCode || "EUR").toUpperCase(),
		taxRatePercent: Number(form.taxRatePercent),
		receiptFooterText: receiptFooterText || null,
		bookingDefaultDurationMin: Number(form.bookingDefaultDurationMin),
		footballFieldsCount: Number(form.footballFieldsCount),
		appointmentBufferMin: Number(form.appointmentBufferMin),
		preventOverlaps: form.preventOverlaps,
		themeDefault: form.themeDefault,
		defaultLocale: form.defaultLocale,
	});
}
</script>

<PageContent>
	<PageHeader title={t("nav.settings")}>
		{#snippet children()}
			<Button type="button" onclick={saveAll} disabled={saving}>
				{t("common.save")}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card class="border-border shadow-sm">
			<div class="p-6 space-y-6">
				<h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("settings.inventory")}</h2>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="low-stock">{t("settings.lowStockThreshold")}</Label>
						<Input id="low-stock" type="number" bind:value={form.lowStockThreshold} class="w-24" />
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.allowUnlimitedStock")}</Label>
						<Switch bind:checked={form.allowUnlimitedStock} />
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.negativeStockAllowed")}</Label>
						<Switch bind:checked={form.negativeStockAllowed} />
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.defaultCategorySort")}</Label>
						<Select bind:value={form.defaultCategorySort} type="single">
							<SelectTrigger class="w-40">
								{form.defaultCategorySort === "name" ? t("settings.categorySort.name") : t("settings.categorySort.custom")}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="name" label={t("settings.categorySort.name")} />
								<SelectItem value="custom" label={t("settings.categorySort.custom")} />
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</Card>

		<Card class="border-border shadow-sm">
			<div class="p-6 space-y-6">
				<h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("settings.coupons")} & {t("settings.sales")}</h2>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="coupon-value">{t("settings.couponsValue")}</Label>
						<Input id="coupon-value" type="number" step="0.01" bind:value={form.couponsValue} class="w-28" />
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.allowTreats")}</Label>
						<Switch bind:checked={form.allowTreats} />
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.requireOpenRegisterForSale")}</Label>
						<Switch bind:checked={form.requireOpenRegisterForSale} />
					</div>
				</div>
			</div>
		</Card>

		<Card class="border-border shadow-sm">
			<div class="p-6 space-y-6">
				<h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("settings.finance")}</h2>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="currency">{t("settings.currencyCode")}</Label>
						<Input id="currency" bind:value={form.currencyCode} class="w-24 uppercase" />
					</div>
					<div class="flex items-center justify-between">
						<Label for="tax">{t("settings.taxRatePercent")}</Label>
						<Input id="tax" type="number" step="0.1" bind:value={form.taxRatePercent} class="w-24" />
					</div>
				</div>
			</div>
		</Card>

		<Card class="border-border shadow-sm">
			<div class="p-6 space-y-6">
				<h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("settings.appearance")}</h2>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label>{t("settings.themeDefault")}</Label>
						<Select bind:value={form.themeDefault} type="single">
							<SelectTrigger class="w-40">
								{t(`theme.${form.themeDefault}`)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="system" label={t("theme.system")} />
								<SelectItem value="light" label={t("theme.light")} />
								<SelectItem value="dark" label={t("theme.dark")} />
							</SelectContent>
						</Select>
					</div>
					<div class="flex items-center justify-between">
						<Label>{t("settings.defaultLocale")}</Label>
						<Select bind:value={form.defaultLocale} type="single">
							<SelectTrigger class="w-40">
								{form.defaultLocale === "en" ? "English" : "Ελληνικά"}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="en" label="English" />
								<SelectItem value="el" label="Ελληνικά" />
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</Card>
	</div>
</PageContent>
