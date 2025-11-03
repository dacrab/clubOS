<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui";
import { afterNavigate } from "$app/navigation";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
import { Switch } from "$lib/components/ui/switch";
import { Textarea } from "$lib/components/ui/textarea";
import { t } from "$lib/i18n";
import type { TenantSettings } from "$lib/settings";
import {
	loadSettings as loadGlobalSettings,
	settingsStore,
} from "$lib/settings";
import { supabase } from "$lib/supabase-client";

let saving = $state(false);

const Select = SelectPrimitive.Root;

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
	const unsubscribe = settingsStore.subscribe((s) => {
		form = { ...s.tenant };
		receiptFooterText = s.tenant.receiptFooterText ?? "";
	});
	loadGlobalSettings();
	// Ensure fresh data when navigating back to this page
	afterNavigate(() => {
		if (
			typeof window !== "undefined" &&
			window.location.pathname === "/admin/settings"
		) {
			loadGlobalSettings();
		}
	});
	return () => {
		unsubscribe();
	};
});

async function upsertTenantSettings(partial: Partial<TenantSettings>) {
	saving = true;
	try {
		const { data: sessionData } = await supabase.auth.getSession();
		const uid = sessionData.session?.user.id ?? "";
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", uid);
		const tenantId = memberships?.[0]?.tenant_id as string | undefined;
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
		for (const [k, v] of Object.entries(partial) as Array<
			[keyof TenantSettings, unknown]
		>) {
			if (v !== undefined) payload[KEY_MAP[k]] = v as unknown;
		}

		// Robust upsert: update existing default row, else insert
		const { data: existing } = await supabase
			.from("tenant_settings")
			.select("id")
			.eq("tenant_id", tenantId)
			.is("facility_id", null)
			.maybeSingle();

		let error: { message: string } | null = null;
		if (existing?.id) {
			const res = await supabase
				.from("tenant_settings")
				.update(payload)
				.eq("id", existing.id);
			error = res.error;
		} else {
			const res = await supabase.from("tenant_settings").insert(payload);
			error = res.error;
		}

		const { toast } = await import("svelte-sonner");
		if (!error) {
			loadGlobalSettings();
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
			<Button
				type="button"
				class="rounded-lg"
				onclick={saveAll}
				disabled={saving}
			>
				{t("common.save")}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.inventory")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label for="low-stock" class="text-sm text-muted-foreground"
						>{t("settings.lowStockThreshold")}</Label
					>
					<Input
						id="low-stock"
						type="number"
						bind:value={form.lowStockThreshold}
						class="w-24 rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.allowUnlimitedStock")}</Label
					>
					<Switch bind:checked={form.allowUnlimitedStock} />
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.negativeStockAllowed")}</Label
					>
					<Switch bind:checked={form.negativeStockAllowed} />
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.defaultCategorySort")}</Label
					>
					<Select bind:value={form.defaultCategorySort} type="single">
						<SelectTrigger
							class="w-40 rounded-lg border-outline-soft bg-background"
						>
							<span
								data-slot="select-value"
								class="truncate text-sm"
							>
								{form.defaultCategorySort === "name"
									? t("settings.categorySort.name")
									: t("settings.categorySort.custom")}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem
							value="name"
							label={t("settings.categorySort.name")}
							/>
							<SelectItem
							value="custom"
							label={t("settings.categorySort.custom")}
							/>
						</SelectContent>
					</Select>
				</div>
				<div class="flex items-center gap-3">
					<Label for="page-size" class="text-sm text-muted-foreground"
						>{t("settings.productsPageSize")}</Label
					>
					<Input
						id="page-size"
						type="number"
						bind:value={form.productsPageSize}
						class="w-28 rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label for="img-max" class="text-sm text-muted-foreground"
						>{t("settings.imageMaxSizeMb")}</Label
					>
					<Input
						id="img-max"
						type="number"
						bind:value={form.imageMaxSizeMb}
						class="w-28 rounded-lg"
					/>
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.coupons")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label
						for="coupon-value"
						class="text-sm text-muted-foreground"
						>{t("settings.couponsValue")}</Label
					>
					<Input
						id="coupon-value"
						type="number"
						step="0.01"
						bind:value={form.couponsValue}
						class="w-28 rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.allowTreats")}</Label
					>
					<Switch bind:checked={form.allowTreats} />
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.sales")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.requireOpenRegisterForSale")}</Label
					>
					<Switch bind:checked={form.requireOpenRegisterForSale} />
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.finance")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label for="currency" class="text-sm text-muted-foreground"
						>{t("settings.currencyCode")}</Label
					>
					<Input
						id="currency"
						bind:value={form.currencyCode}
						class="w-24 uppercase rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label for="tax" class="text-sm text-muted-foreground"
						>{t("settings.taxRatePercent")}</Label
					>
					<Input
						id="tax"
						type="number"
						step="0.1"
						bind:value={form.taxRatePercent}
						class="w-24 rounded-lg"
					/>
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.receipt")}
			</h2>
			<div class="mt-4 grid gap-4">
				<Label
					for="receipt-footer"
					class="text-sm text-muted-foreground"
					>{t("settings.receiptFooterText")}</Label
				>
				<Textarea
					id="receipt-footer"
					bind:value={receiptFooterText}
					class="rounded-lg border-outline-soft bg-background"
				/>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.bookings")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label
						for="booking-duration"
						class="text-sm text-muted-foreground"
						>{t("settings.bookingDefaultDurationMin")}</Label
					>
					<Input
						id="booking-duration"
						type="number"
						bind:value={form.bookingDefaultDurationMin}
						class="w-28 rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label for="buffer" class="text-sm text-muted-foreground"
						>{t("settings.appointmentBufferMin")}</Label
					>
					<Input
						id="buffer"
						type="number"
						bind:value={form.appointmentBufferMin}
						class="w-28 rounded-lg"
					/>
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.preventOverlaps")}</Label
					>
					<Switch bind:checked={form.preventOverlaps} />
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.football")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label
						for="fields-count"
						class="text-sm text-muted-foreground"
						>{t("settings.footballFieldsCount")}</Label
					>
					<Input
						id="fields-count"
						type="number"
						bind:value={form.footballFieldsCount}
						class="w-28 rounded-lg"
					/>
				</div>
			</div>
		</Card>

		<Card
			class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
		>
			<h2 class="text-sm font-semibold uppercase text-muted-foreground">
				{t("settings.appearance")}
			</h2>
			<div class="mt-4 grid gap-4">
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.themeDefault")}</Label
					>
					<Select bind:value={form.themeDefault} type="single">
						<SelectTrigger
							class="w-40 rounded-lg border-outline-soft bg-background"
						>
							<span
								data-slot="select-value"
								class="truncate text-sm"
							>
								{t(`theme.${form.themeDefault}`)}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								value="system"
								label={t("theme.system")}
							/>
							<SelectItem
								value="light"
								label={t("theme.light")}
							/>
							<SelectItem value="dark" label={t("theme.dark")} />
						</SelectContent>
					</Select>
				</div>
				<div class="flex items-center gap-3">
					<Label class="text-sm text-muted-foreground"
						>{t("settings.defaultLocale")}</Label
					>
					<Select bind:value={form.defaultLocale} type="single">
						<SelectTrigger
							class="w-40 rounded-lg border-outline-soft bg-background"
						>
							<span
								data-slot="select-value"
								class="truncate text-sm"
							>
								{form.defaultLocale === "en"
									? "English"
									: "Ελληνικά"}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="en" label="English" />
							<SelectItem value="el" label="Ελληνικά" />
						</SelectContent>
					</Select>
				</div>
			</div>
		</Card>
	</div>
</PageContent>
