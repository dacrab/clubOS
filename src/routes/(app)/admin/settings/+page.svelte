<script lang="ts">
	import { untrack } from "svelte";
	import { enhance } from "$app/forms";
	import { t } from "$lib/i18n/index.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import { PageHeader } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator";
	import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "$lib/config/settings";
	import { Save, RotateCcw } from "@lucide/svelte";

	const { data } = $props();

	let settings = $state(untrack(() => structuredClone(data.settings)));
	let saving = $state(false);
	let lastServerSettings = $state(untrack(() => JSON.stringify(data.settings)));

	$effect(() => {
		const serverJson = JSON.stringify(data.settings);
		if (serverJson !== untrack(() => lastServerSettings)) {
			settings = structuredClone(data.settings);
			lastServerSettings = serverJson;
		}
	});

	const hasChanges = $derived(JSON.stringify(settings) !== lastServerSettings);

	const getCurrencyLabel = (v: string | null) => CURRENCY_OPTIONS.find((c) => c.value === v)?.label ?? "";
	const getDateLabel = (v: string | null) => DATE_FORMAT_OPTIONS.find((f) => f.value === v)?.label ?? "";
	const getTimeLabel = (v: string | null) => {
		const f = TIME_FORMAT_OPTIONS.find((f) => f.value === v);
		return f ? t(f.labelKey) : "";
	};

	function handleReset() {
		settings = structuredClone(data.settings);
	}
</script>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ result }) => {
			saving = false;
			if (result.type === "success") {
				toast.success(t("common.success"));
				await invalidateAll();
			} else {
				toast.error(t("common.error"));
			}
		};
	}}
>
	<input type="hidden" name="settings" value={JSON.stringify(settings)} />

<div class="space-y-6">
	<PageHeader title={t("settings.title")} description={t("settings.subtitle")}>
		{#snippet actions()}
			{#if hasChanges}
				<Button variant="outline" type="button" onclick={handleReset}>
					<RotateCcw class="mr-2 h-4 w-4" />
					{t("common.cancel")}
				</Button>
			{/if}
			<Button type="submit" disabled={saving || !hasChanges}>
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
					<div>
						<Label for="lowStock">{t("settings.lowStockThreshold")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.lowStockThresholdDesc")}</p>
					</div>
					<Input id="lowStock" type="number" min="0" bind:value={settings.low_stock_threshold} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label>{t("settings.allowUnlimitedStock")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.allowUnlimitedStockDesc")}</p>
					</div>
					<Switch bind:checked={settings.allow_unlimited_stock} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
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
					<div>
						<Label for="coupon">{t("settings.couponsValue")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.couponsValueDesc")}</p>
					</div>
					<Input id="coupon" type="number" step="0.01" min="0" bind:value={settings.coupons_value} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label>{t("settings.allowTreats")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.allowTreatsDesc")}</p>
					</div>
					<Switch bind:checked={settings.allow_treats} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label>{t("settings.requireOpenRegister")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.requireOpenRegisterDesc")}</p>
					</div>
					<Switch bind:checked={settings.require_open_register_for_sale} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="tax">{t("settings.taxRate")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.taxRateDesc")}</p>
					</div>
					<Input id="tax" type="number" step="0.01" min="0" max="100" bind:value={settings.tax_rate_percent} class="w-20" />
				</div>
			</CardContent>
		</Card>

		<!-- Booking Settings -->
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.bookings")}</CardTitle>
				<CardDescription>{t("settings.sections.bookingsDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<Label for="fields">{t("settings.footballFieldsCount")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.footballFieldsCountDesc")}</p>
					</div>
					<Input id="fields" type="number" min="1" max="20" bind:value={settings.football_fields_count} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="buffer">{t("settings.appointmentBuffer")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.appointmentBufferDesc")}</p>
					</div>
					<Input id="buffer" type="number" min="0" max="120" bind:value={settings.appointment_buffer_min} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="dur">{t("settings.bookingDuration")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.bookingDurationDesc")}</p>
					</div>
					<Input id="dur" type="number" min="10" max="600" bind:value={settings.booking_default_duration_min} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="bdur">{t("settings.birthdayDuration")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.birthdayDurationDesc")}</p>
					</div>
					<Input id="bdur" type="number" min="30" max="480" bind:value={settings.birthday_duration_min} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="fdur">{t("settings.footballDuration")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.footballDurationDesc")}</p>
					</div>
					<Input id="fdur" type="number" min="30" max="300" bind:value={settings.football_duration_min} class="w-20" />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
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
					<div>
						<Label>{t("settings.currencyCode")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.currencyCodeDesc")}</p>
					</div>
					<Select bind:value={settings.currency_code}>
						<SelectTrigger class="w-40" selected={getCurrencyLabel(settings.currency_code)} />
						<SelectContent>
							{#each CURRENCY_OPTIONS as c (c.value)}
								<SelectItem value={c.value}>{c.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label>{t("settings.dateFormat")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.dateFormatDesc")}</p>
					</div>
					<Select bind:value={settings.date_format}>
						<SelectTrigger class="w-48" selected={getDateLabel(settings.date_format)} />
						<SelectContent>
							{#each DATE_FORMAT_OPTIONS as f (f.value)}
								<SelectItem value={f.value}>{f.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label>{t("settings.timeFormat")}</Label>
						<p class="text-xs text-muted-foreground">{t("settings.timeFormatDesc")}</p>
					</div>
					<Select bind:value={settings.time_format}>
						<SelectTrigger class="w-32" selected={getTimeLabel(settings.time_format)} />
						<SelectContent>
							{#each TIME_FORMAT_OPTIONS as f (f.value)}
								<SelectItem value={f.value}>{t(f.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
</form>
