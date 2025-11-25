<script lang="ts">
import flatpickr from "flatpickr";
import { Greek } from "flatpickr/dist/l10n/gr.js";
import { createEventDispatcher, onDestroy, onMount } from "svelte";
import Input from "$lib/components/ui/input/input.svelte";
import { i18nState, tt as t } from "$lib/state/i18n.svelte";
import "flatpickr/dist/flatpickr.min.css";

((..._args: unknown[]) => {
	return;
})(Input, t);

// Types
type Range = { start: string; end: string };
type PresetId = "all" | "today" | "yesterday" | "last7" | "last30";
type PresetLabelKey = "date.all" | "date.today" | "date.yesterday" | "date.last7" | "date.last30";

// Props and bindings
let { start = $bindable("") as string, end = $bindable("") as string } = $props<{
	start: string;
	end: string;
}>();

// Event dispatcher
const dispatch = createEventDispatcher<{ change: Range }>();

// Constants
const CENTURY_OFFSET = 100;
const YEAR_2000 = 2000;
const LAST_7_DAYS_OFFSET = -6;
const LAST_30_DAYS_OFFSET = -29;

const presets: { id: PresetId; labelKey: PresetLabelKey }[] = [
	{ id: "all", labelKey: "date.all" },
	{ id: "today", labelKey: "date.today" },
	{ id: "yesterday", labelKey: "date.yesterday" },
	{ id: "last7", labelKey: "date.last7" },
	{ id: "last30", labelKey: "date.last30" },
];

// State variables
type FlatpickrLike = {
	destroy: () => void;
	setDate: (date: Date, triggerChange?: boolean) => void;
	set?: (option: string, value: unknown) => void;
};
type FlatpickrOptionsApprox = {
	dateFormat?: string;
	allowInput?: boolean;
	defaultDate?: Date;
	onChange?: (_selectedDates: Date[], dateStr: string) => void;
};
let startInput = $state<HTMLInputElement | null>(null);
let endInput = $state<HTMLInputElement | null>(null);
let fpStart: FlatpickrLike | null = null;
let fpEnd: FlatpickrLike | null = null;

// Derived state
const activePresetId = $derived(
	(() => {
		for (const p of presets) {
			const r = getPresetRange(p.id);
			if (start === r.start && end === r.end) {
				return p.id as PresetId;
			}
		}
		return null as PresetId | null;
	})(),
);

// Date utility functions
function todayISO(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function shiftDays(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function isoToDMY(iso: string): string {
	if (!iso) {
		return "";
	}
	const [yyyy, mm, dd] = iso.split("-");
	const yy = String(Number(yyyy) % CENTURY_OFFSET).padStart(2, "0");
	return `${dd}-${mm}-${yy}`;
}

function dmyToISO(dmy: string): string {
	if (!dmy) {
		return "";
	}
	const [dd, mm, y] = dmy.split("-");
	const yPart = y ?? "";
	const yyyy = yPart.length === 2 ? String(YEAR_2000 + Number(yPart)) : yPart;
	if (!(yyyy && mm && dd)) {
		return "";
	}
	return `${yyyy}-${mm}-${dd}`;
}

// Range functions
function setRange(next: Range) {
	const changed = start !== next.start || end !== next.end;
	start = next.start;
	end = next.end;
	if (changed) {
		dispatch("change", next);
	}
}

function getPresetRange(id: PresetId): Range {
	if (id === "all") {
		return { start: "", end: "" };
	}
	if (id === "today") {
		return { start: todayISO(), end: todayISO() };
	}
	if (id === "yesterday") {
		return { start: shiftDays(-1), end: shiftDays(-1) };
	}
	if (id === "last7") {
		return { start: shiftDays(LAST_7_DAYS_OFFSET), end: todayISO() };
	}
	// id === "last30"
	return { start: shiftDays(LAST_30_DAYS_OFFSET), end: todayISO() };
}

// Flatpickr initialization
onMount(() => {
	if (startInput) {
		const localeOpt: unknown = i18nState.locale === "el" ? Greek : undefined;
		const base: FlatpickrOptionsApprox = {
			dateFormat: "d-m-y",
			allowInput: true,
			locale: localeOpt,
			onChange: (_selectedDates: Date[], dateStr: string) => {
				setRange({ start: dmyToISO(dateStr), end });
			},
		} as FlatpickrOptionsApprox & { locale?: unknown };
		const opts: FlatpickrOptionsApprox = start
			? { ...base, defaultDate: new Date(dmyToISO(isoToDMY(start))) }
			: base;
		fpStart = flatpickr(startInput, opts) as unknown as FlatpickrLike;
	}

	if (endInput) {
		const localeOpt: unknown = i18nState.locale === "el" ? Greek : undefined;
		const base: FlatpickrOptionsApprox = {
			dateFormat: "d-m-y",
			allowInput: true,
			locale: localeOpt,
			onChange: (_selectedDates: Date[], dateStr: string) => {
				setRange({ start, end: dmyToISO(dateStr) });
			},
		} as FlatpickrOptionsApprox & { locale?: unknown };
		const opts: FlatpickrOptionsApprox = end
			? { ...base, defaultDate: new Date(dmyToISO(isoToDMY(end))) }
			: base;
		fpEnd = flatpickr(endInput, opts) as unknown as FlatpickrLike;
	}
});

onDestroy(() => {
	fpStart?.destroy();
	fpEnd?.destroy();
});

// Effects for syncing external updates
$effect(() => {
	if (fpStart && start) {
		fpStart.setDate(new Date(dmyToISO(isoToDMY(start))), false);
	}
});

$effect(() => {
	if (fpEnd && end) {
		fpEnd.setDate(new Date(dmyToISO(isoToDMY(end))), false);
	}
});

// React to locale changes
$effect(() => {
	const lng = i18nState.locale;
	const localeOpt: unknown = lng === "el" ? Greek : undefined;
	fpStart?.set?.("locale", localeOpt);
	fpEnd?.set?.("locale", localeOpt);
});
</script>

<div class="flex flex-col gap-2">
  <div class="grid gap-2 sm:grid-cols-2">
    <Input
      type="text"
      bind:ref={startInput}
      placeholder={t("date.rangePlaceholderStart")}
      class="h-10 w-full rounded-md border border-input bg-background px-3 cursor-pointer"
      aria-label={t("date.rangePlaceholderStart")}
      autocomplete="off"
      readonly
    />
    <Input
      type="text"
      bind:ref={endInput}
      placeholder={t("date.rangePlaceholderEnd")}
      class="h-10 w-full rounded-md border border-input bg-background px-3 cursor-pointer"
      aria-label={t("date.rangePlaceholderEnd")}
      autocomplete="off"
      readonly
    />
  </div>
  <div class="flex flex-wrap gap-2" role="group" aria-label={t("date")}>
    {#each presets as p}
      <button
        type="button"
        class={`rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted ${activePresetId === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input"}`}
        aria-pressed={activePresetId === p.id}
        onclick={() => setRange(getPresetRange(p.id))}
      >
        {t(p.labelKey)}
      </button>
    {/each}
  </div>
</div>
