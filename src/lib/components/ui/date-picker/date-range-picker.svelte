<script lang="ts">
import { createEventDispatcher } from "svelte";
import { DatePicker } from "$lib/components/ui/date-picker";

type Range = { start: string; end: string };

let {
  start = $bindable("") as string,
  end = $bindable("") as string,
} = $props<{ start: string; end: string }>();

const dispatch = createEventDispatcher<{ change: Range }>();

function setRange(next: Range) {
  start = next.start;
  end = next.end;
  dispatch("change", next);
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

function onQuick(range: "today" | "yesterday" | "last7" | "last30") {
  if (range === "today") setRange({ start: todayISO(), end: todayISO() });
  if (range === "yesterday")
    setRange({ start: shiftDays(-1), end: shiftDays(-1) });
  if (range === "last7") setRange({ start: shiftDays(-6), end: todayISO() });
  if (range === "last30") setRange({ start: shiftDays(-29), end: todayISO() });
}
</script>

<div class="flex flex-col gap-2">
  <div class="grid gap-2 sm:grid-cols-2">
    <div class="rounded-2xl border border-outline-soft bg-background px-3 py-2 opacity-100 disabled:opacity-60">
      <DatePicker bind:value={start} ariaLabel="Start date" />
    </div>
    <div class="rounded-2xl border border-outline-soft bg-background px-3 py-2 opacity-100 disabled:opacity-60">
      <DatePicker bind:value={end} ariaLabel="End date" />
    </div>
  </div>
  <div class="flex flex-wrap gap-2">
    <button type="button" class="rounded-full border border-outline-soft px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onclick={() => onQuick("today")}>
      Σήμερα
    </button>
    <button type="button" class="rounded-full border border-outline-soft px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onclick={() => onQuick("yesterday")}>
      Χθες
    </button>
    <button type="button" class="rounded-full border border-outline-soft px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onclick={() => onQuick("last7")}>
      Τελευταίες 7
    </button>
    <button type="button" class="rounded-full border border-outline-soft px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onclick={() => onQuick("last30")}>
      Τελευταίες 30
    </button>
  </div>
</div>


