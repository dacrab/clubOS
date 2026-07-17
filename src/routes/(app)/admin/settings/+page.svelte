<script lang="ts">
import { RotateCcw, Save } from "@lucide/svelte";
import { untrack } from "svelte";
import { toast } from "svelte-sonner";
import { enhance } from "$app/forms";
import { invalidateAll } from "$app/navigation";
import PageHeader from "$lib/components/layout/page-header.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card, {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/card/card.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Select from "$lib/components/ui/select/select.svelte";
import SelectContent from "$lib/components/ui/select/select-content.svelte";
import SelectItem from "$lib/components/ui/select/select-item.svelte";
import SelectTrigger from "$lib/components/ui/select/select-trigger.svelte";
import Separator from "$lib/components/ui/separator/separator.svelte";
import SettingRow from "$lib/components/ui/setting-row/setting-row.svelte";
import Switch from "$lib/components/ui/switch/switch.svelte";
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "$lib/config/settings";
import { i18n, type Locale, t } from "$lib/i18n/index.svelte";
import { isValid as isValidTheme, type Theme, theme } from "$lib/state/theme.svelte";

const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
	{ value: "system", labelKey: "settings.themes.system" },
	{ value: "light", labelKey: "settings.themes.light" },
	{ value: "dark", labelKey: "settings.themes.dark" },
];
const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
	{ value: "en", labelKey: "settings.languages.en" },
	{ value: "el", labelKey: "settings.languages.el" },
];

const MAX_FOOTBALL_FIELDS = 20;
const MAX_APPOINTMENT_BUFFER_MIN = 120;
const MAX_BIRTHDAY_DURATION_MIN = 480;
const MAX_FOOTBALL_DURATION_MIN = 300;

const { data } = $props();

let settings = $state(untrack(() => ({ ...data.settings })));
let saved = $state("");
$effect(() => {
	const next = JSON.stringify(data.settings);
	if (next !== saved) {
		settings = { ...data.settings };
		saved = next;
	}
});
let saving = $state(false);
const hasChanges = $derived(JSON.stringify(settings) !== saved);

const optionLabel = (
	opts: readonly { value: string; labelKey: string }[],
	v: string | null,
): string => t(opts.find((o) => o.value === v)?.labelKey ?? "");

const handleReset = (): void => {
	settings = { ...data.settings };
};
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
					<Input id="fields" type="number" min="1" max={MAX_FOOTBALL_FIELDS} bind:value={settings.football_fields_count} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="buffer" label={t("settings.appointmentBuffer")} description={t("settings.appointmentBufferDesc")}>
					<Input id="buffer" type="number" min="0" max={MAX_APPOINTMENT_BUFFER_MIN} bind:value={settings.appointment_buffer_min} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="bdur" label={t("settings.birthdayDuration")} description={t("settings.birthdayDurationDesc")}>
					<Input id="bdur" type="number" min="30" max={MAX_BIRTHDAY_DURATION_MIN} bind:value={settings.birthday_duration_min} class="w-20" />
				</SettingRow>
				<Separator />
				<SettingRow id="fdur" label={t("settings.footballDuration")} description={t("settings.footballDurationDesc")}>
					<Input id="fdur" type="number" min="30" max={MAX_FOOTBALL_DURATION_MIN} bind:value={settings.football_duration_min} class="w-20" />
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
					<Select value={theme.current} onValueChange={(v) => { if (isValidTheme(v)) theme.setTheme(v); }}>
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
					<Select value={i18n.locale} onValueChange={(v) => { if (v === "en" || v === "el") i18n.setLocale(v); }}>
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
