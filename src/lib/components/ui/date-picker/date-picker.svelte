<script lang="ts">
import { Input } from "$lib/components/ui/input";
import { locale } from "$lib/i18n";

let { value = $bindable(""), ariaLabel = "", showTime = false, time = $bindable("") } = $props<{
  value: string; // YYYY-MM-DD
  ariaLabel?: string;
  showTime?: boolean;
  time?: string; // HH:mm (24h)
}>();

// Initialize defaults
$effect(() => {
  const d = new Date();
  if (!value) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    value = `${yyyy}-${mm}-${dd}`;
  }
  if (showTime && !time) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    time = `${hh}:${mi}`;
  }
});

function formatDateOnly(): string {
  const d = new Date(`${value || "1970-01-01"}T00:00`);
  const current = $locale === "el" ? "el-GR" : "en-GB";
  return new Intl.DateTimeFormat(current, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
}
function normalizeTimeString(str: string): string {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(str.trim());
  if (m) return `${m[1]}:${m[2]}`;
  return "";
}

// no refs needed
</script>

<svelte:window />
<div class="grid gap-1">
  <div class="grid items-center gap-2" style="grid-template-columns: {showTime ? '1fr auto' : '1fr'};">
    <Input type="date" bind:value={value} class="w-44" aria-label={ariaLabel} lang={$locale === 'el' ? 'el-GR' : 'en-GB'} />
    {#if showTime}
      <Input
        type="text"
        inputmode="numeric"
        placeholder="HH:MM"
        bind:value={time}
        class="w-28"
        aria-label={ariaLabel}
      />
    {/if}
  </div>
  <div class="text-xs text-muted-foreground">{formatDateOnly()}{#if showTime}, {normalizeTimeString(time) || time}{/if}</div>
</div>


