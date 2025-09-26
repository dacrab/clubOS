<script lang="ts">
import { createEventDispatcher } from "svelte";
import { Input } from "$lib/components/ui/input";
import { locale, t } from "$lib/i18n";

type Range = { start: string; end: string };

let { start = $bindable("") as string, end = $bindable("") as string } =
  $props<{ start: string; end: string }>();

const dispatch = createEventDispatcher<{ change: Range }>();

function setRange(next: Range) {
  const changed = start !== next.start || end !== next.end;
  start = next.start;
  end = next.end;
  if (changed) dispatch("change", next);
}

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

type PresetId = "all" | "today" | "yesterday" | "last7" | "last30";
type PresetLabelKey =
  | "date.all"
  | "date.today"
  | "date.yesterday"
  | "date.last7"
  | "date.last30";

const presets: { id: PresetId; labelKey: PresetLabelKey }[] = [
  { id: "all", labelKey: "date.all" },
  { id: "today", labelKey: "date.today" },
  { id: "yesterday", labelKey: "date.yesterday" },
  { id: "last7", labelKey: "date.last7" },
  { id: "last30", labelKey: "date.last30" },
];

function getPresetRange(id: PresetId): Range {
  const LAST_7_DAYS_OFFSET = -6;
  const LAST_30_DAYS_OFFSET = -29;
  if (id === "all") return { start: "", end: "" };
  if (id === "today") return { start: todayISO(), end: todayISO() };
  if (id === "yesterday") return { start: shiftDays(-1), end: shiftDays(-1) };
  if (id === "last7")
    return { start: shiftDays(LAST_7_DAYS_OFFSET), end: todayISO() };
  // id === "last30"
  return { start: shiftDays(LAST_30_DAYS_OFFSET), end: todayISO() };
}

const activePresetId = $derived(
  (() => {
    for (const p of presets) {
      const r = getPresetRange(p.id);
      if (start === r.start && end === r.end) return p.id as PresetId;
    }
    return null as PresetId | null;
  })()
);
</script>

<div class="flex flex-col gap-2">
  <div class="grid gap-2 sm:grid-cols-2">
    <div class="rounded-2xl border border-outline-soft bg-background px-3 py-2 opacity-100 disabled:opacity-60">
      <Input type="date" bind:value={start} class="w-44" aria-label="Start date" lang={$locale === 'el' ? 'el-GR' : 'en-GB'} />
    </div>
    <div class="rounded-2xl border border-outline-soft bg-background px-3 py-2 opacity-100 disabled:opacity-60">
      <Input type="date" bind:value={end} class="w-44" aria-label="End date" lang={$locale === 'el' ? 'el-GR' : 'en-GB'} />
    </div>
  </div>
  <div class="flex flex-wrap gap-2" role="group" aria-label={t("date")}> 
    {#each presets as p}
      <button
        type="button"
        class={`rounded-full border border-outline-soft px-3 py-1 text-xs hover:bg-muted ${activePresetId === p.id ? "bg-muted text-foreground" : "text-muted-foreground"}`}
        aria-pressed={activePresetId === p.id}
        onclick={() => setRange(getPresetRange(p.id))}
      >
        {t(p.labelKey)}
      </button>
    {/each}
  </div>
</div>


