<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { PageHeader } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator";
	import { supabase } from "$lib/utils/supabase";
	import { invalidateAll } from "$app/navigation";
	import { Save, RotateCcw } from "@lucide/svelte";

	const { data } = $props();

	// Clone settings to allow editing
	let settings = $state({ ...data.settings });
	let saving = $state(false);
	let hasChanges = $derived(JSON.stringify(settings) !== JSON.stringify(data.settings));

	// Date format options (labels are format examples, not i18n keys)
	const dateFormats = [
		{ value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
		{ value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
		{ value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
		{ value: "DD.MM.YYYY", label: "DD.MM.YYYY (31.12.2024)" },
		{ value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2024)" },
	];

	// Time format options (use i18n keys)
	const timeFormats = [
		{ value: "24h", labelKey: "settings.timeFormats.24h" },
		{ value: "12h", labelKey: "settings.timeFormats.12h" },
	];

	// Currency options (labels are standard currency names)
	const currencies = [
		{ value: "EUR", label: "Euro (EUR)" },
		{ value: "USD", label: "US Dollar (USD)" },
		{ value: "GBP", label: "British Pound (GBP)" },
	];

	// Helper functions to get display labels
	function getCurrencyLabel(value: string | null) {
		const currency = currencies.find(c => c.value === value);
		return currency ? currency.label : "";
	}

	function getDateFormatLabel(value: string | null) {
		const format = dateFormats.find(f => f.value === value);
		return format ? format.label : "";
	}

	function getTimeFormatLabel(value: string | null) {
		const format = timeFormats.find(f => f.value === value);
		return format ? t(format.labelKey) : "";
	}

	function resetChanges() {
		settings = { ...data.settings };
	}

	async function handleSave() {
		saving = true;
		try {
			const settingsData = {
				low_stock_threshold: settings.low_stock_threshold,
				allow_unlimited_stock: settings.allow_unlimited_stock,
				negative_stock_allowed: settings.negative_stock_allowed,
				default_category_sort: settings.default_category_sort,
				products_page_size: settings.products_page_size,
				coupons_value: settings.coupons_value,
				allow_treats: settings.allow_treats,
				require_open_register_for_sale: settings.require_open_register_for_sale,
				currency_code: settings.currency_code,
				tax_rate_percent: settings.tax_rate_percent,
				receipt_footer_text: settings.receipt_footer_text || null,
				booking_default_duration_min: settings.booking_default_duration_min,
				football_fields_count: settings.football_fields_count,
				appointment_buffer_min: settings.appointment_buffer_min,
				prevent_overlaps: settings.prevent_overlaps,
				date_format: settings.date_format,
				time_format: settings.time_format,
			};

			if (settings.id) {
				// Update existing settings
				const { error } = await supabase
					.from("tenant_settings")
					.update(settingsData)
					.eq("id", settings.id);

				if (error) throw error;
			} else {
				// Create new settings
				const { error } = await supabase
					.from("tenant_settings")
					.insert({
						tenant_id: settings.tenant_id,
						...settingsData,
					});

				if (error) throw error;
			}

			toast.success(t("common.success"));
			await invalidateAll();
		} catch {
			toast.error(t("common.error"));
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("settings.title")} description={t("settings.subtitle")}>
		{#snippet actions()}
			{#if hasChanges}
				<Button variant="outline" onclick={resetChanges}>
					<RotateCcw class="mr-2 h-4 w-4" />
					{t("common.cancel")}
				</Button>
			{/if}
			<Button onclick={handleSave} disabled={saving || !hasChanges}>
				<Save class="mr-2 h-4 w-4" />
				{saving ? t("common.loading") : t("common.save")}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Inventory Settings -->
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.inventory")}</CardTitle>
				<CardDescription>{t("settings.sections.inventoryDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="lowStock">{t("settings.lowStockThreshold")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.lowStockThresholdDesc")}</p>
					</div>
					<Input
						id="lowStock"
						type="number"
						min="0"
						bind:value={settings.low_stock_threshold}
						class="w-20"
					/>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.allowUnlimitedStock")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.allowUnlimitedStockDesc")}</p>
					</div>
					<Switch bind:checked={settings.allow_unlimited_stock} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.negativeStockAllowed")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.negativeStockAllowedDesc")}</p>
					</div>
					<Switch bind:checked={settings.negative_stock_allowed} />
				</div>
			</CardContent>
		</Card>

		<!-- Sales Settings -->
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.sales")}</CardTitle>
				<CardDescription>{t("settings.sections.salesDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="couponValue">{t("settings.couponsValue")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.couponsValueDesc")}</p>
					</div>
					<Input
						id="couponValue"
						type="number"
						step="0.01"
						min="0"
						bind:value={settings.coupons_value}
						class="w-20"
					/>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.allowTreats")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.allowTreatsDesc")}</p>
					</div>
					<Switch bind:checked={settings.allow_treats} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.requireOpenRegister")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.requireOpenRegisterDesc")}</p>
					</div>
					<Switch bind:checked={settings.require_open_register_for_sale} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="tax">{t("settings.taxRate")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.taxRateDesc")}</p>
					</div>
					<Input
						id="tax"
						type="number"
						step="0.01"
						min="0"
						max="100"
						bind:value={settings.tax_rate_percent}
						class="w-20"
					/>
				</div>
			</CardContent>
		</Card>

		<!-- Bookings Settings -->
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.bookings")}</CardTitle>
				<CardDescription>{t("settings.sections.bookingsDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="fields">{t("settings.footballFieldsCount")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.footballFieldsCountDesc")}</p>
					</div>
					<Input
						id="fields"
						type="number"
						min="1"
						max="20"
						bind:value={settings.football_fields_count}
						class="w-20"
					/>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="buffer">{t("settings.appointmentBuffer")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.appointmentBufferDesc")}</p>
					</div>
					<Input
						id="buffer"
						type="number"
						min="0"
						max="120"
						bind:value={settings.appointment_buffer_min}
						class="w-20"
					/>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="duration">{t("settings.bookingDuration")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.bookingDurationDesc")}</p>
					</div>
					<Input
						id="duration"
						type="number"
						min="10"
						max="600"
						bind:value={settings.booking_default_duration_min}
						class="w-20"
					/>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.preventOverlaps")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.preventOverlapsDesc")}</p>
					</div>
					<Switch bind:checked={settings.prevent_overlaps} />
				</div>
			</CardContent>
		</Card>

		<!-- Regional Settings -->
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.regional")}</CardTitle>
				<CardDescription>{t("settings.sections.regionalDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.currencyCode")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.currencyCodeDesc")}</p>
					</div>
					<Select bind:value={settings.currency_code}>
						<SelectTrigger class="w-32" selected={getCurrencyLabel(settings.currency_code)} />
						<SelectContent>
							{#each currencies as currency (currency.value)}
								<SelectItem value={currency.value}>{currency.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.dateFormat")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.dateFormatDesc")}</p>
					</div>
					<Select bind:value={settings.date_format}>
						<SelectTrigger class="w-48" selected={getDateFormatLabel(settings.date_format)} />
						<SelectContent>
							{#each dateFormats as format (format.value)}
								<SelectItem value={format.value}>{format.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>{t("settings.timeFormat")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.timeFormatDesc")}</p>
					</div>
					<Select bind:value={settings.time_format}>
						<SelectTrigger class="w-32" selected={getTimeFormatLabel(settings.time_format)} />
						<SelectContent>
							{#each timeFormats as format (format.value)}
								<SelectItem value={format.value}>{t(format.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
