<script lang="ts">
	import { untrack } from "svelte";
	import { enhance } from "$app/forms";
	import { t, i18n, type Locale } from "$lib/i18n/index.svelte";
	import { theme, type Theme } from "$lib/state/theme.svelte";
	import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
	import PageHeader from "$lib/components/layout/page-header.svelte";
	import Card, { CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card/card.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import Input from "$lib/components/ui/input/input.svelte";
	import Switch from "$lib/components/ui/switch/switch.svelte";
	import Select from "$lib/components/ui/select/select.svelte";
	import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
	import SelectContent from "$lib/components/ui/select/select-content.svelte";
	import SelectItem from "$lib/components/ui/select/select-item.svelte";
	import Separator from "$lib/components/ui/separator/separator.svelte";
	import SettingRow from "$lib/components/ui/setting-row/setting-row.svelte";
	import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "$lib/config/settings";
	import { Save, RotateCcw } from "@lucide/svelte";

	const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
		{ value: "system", labelKey: "settings.themes.system" },
		{ value: "light", labelKey: "settings.themes.light" },
		{ value: "dark", labelKey: "settings.themes.dark" },
	];
	const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
		{ value: "en", labelKey: "settings.languages.en" },
		{ value: "el", labelKey: "settings.languages.el" },
	];

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

	const optionLabel = (opts: readonly { value: string; labelKey: string }[], v: string | null) => t(opts.find((o) => o.value === v)?.labelKey ?? "");

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
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.inventory")}</CardTitle>
				<CardDescription>{t("settings.sections.inventoryDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<SettingRow id="lowStock" label={t("settings.lowStockThreshold")} description={t("settings.lowStockThresholdDesc")}>
					<Input id="lowStock" type="number" min="0" bind:value={settings.low_stock_threshold} class="w-20" />
				</SettingRow>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.bookings")}</CardTitle>
				<CardDescription>{t("settings.sections.bookingsDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<SettingRow id="fields" label={t("settings.footballFieldsCount")} description={t("settings.footballFieldsCountDesc")}>
					<Input id="fields" type="number" min="1" max="20" bind:value={settings.football_fields_count} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="buffer" label={t("settings.appointmentBuffer")} description={t("settings.appointmentBufferDesc")}>
					<Input id="buffer" type="number" min="0" max="120" bind:value={settings.appointment_buffer_min} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="bdur" label={t("settings.birthdayDuration")} description={t("settings.birthdayDurationDesc")}>
					<Input id="bdur" type="number" min="30" max="480" bind:value={settings.birthday_duration_min} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="fdur" label={t("settings.footballDuration")} description={t("settings.footballDurationDesc")}>
					<Input id="fdur" type="number" min="30" max="300" bind:value={settings.football_duration_min} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow label={t("settings.preventOverlaps")} description={t("settings.preventOverlapsDesc")}>
					<Switch bind:checked={settings.prevent_overlaps} />
				</SettingRow>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>{t("settings.sections.regional")}</CardTitle>
				<CardDescription>{t("settings.sections.regionalDesc")}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<SettingRow label={t("settings.theme")} description={t("settings.themeDesc")}>
					<Select value={theme.current} onValueChange={(v) => theme.setTheme(v as Theme)}>
						<SelectTrigger class="w-40" selected={optionLabel(THEME_OPTIONS, theme.current)} />
						<SelectContent>
							{#each THEME_OPTIONS as o (o.value)}
								<SelectItem value={o.value}>{t(o.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</SettingRow>
				<Separator />
				<SettingRow label={t("settings.language")} description={t("settings.languageDesc")}>
					<Select value={i18n.locale} onValueChange={(v) => i18n.setLocale(v as Locale)}>
						<SelectTrigger class="w-40" selected={optionLabel(LANGUAGE_OPTIONS, i18n.locale)} />
						<SelectContent>
							{#each LANGUAGE_OPTIONS as o (o.value)}
								<SelectItem value={o.value}>{t(o.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</SettingRow>
				<Separator />
				<SettingRow label={t("settings.currencyCode")} description={t("settings.currencyCodeDesc")}>
					<Select bind:value={settings.currency_code}>
						<SelectTrigger class="w-40" selected={optionLabel(CURRENCY_OPTIONS, settings.currency_code)} />
						<SelectContent>
							{#each CURRENCY_OPTIONS as c (c.value)}
								<SelectItem value={c.value}>{t(c.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</SettingRow>
				<Separator />
				<SettingRow label={t("settings.dateFormat")} description={t("settings.dateFormatDesc")}>
					<Select bind:value={settings.date_format}>
						<SelectTrigger class="w-48" selected={optionLabel(DATE_FORMAT_OPTIONS, settings.date_format)} />
						<SelectContent>
							{#each DATE_FORMAT_OPTIONS as f (f.value)}
								<SelectItem value={f.value}>{t(f.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</SettingRow>
				<Separator />
				<SettingRow label={t("settings.timeFormat")} description={t("settings.timeFormatDesc")}>
					<Select bind:value={settings.time_format}>
						<SelectTrigger class="w-32" selected={optionLabel(TIME_FORMAT_OPTIONS, settings.time_format)} />
						<SelectContent>
							{#each TIME_FORMAT_OPTIONS as f (f.value)}
								<SelectItem value={f.value}>{t(f.labelKey)}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</SettingRow>
			</CardContent>
		</Card>
	</div>
</div>
</form>
