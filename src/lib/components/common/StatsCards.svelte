<script lang="ts">
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";

const { items } = $props<{
  items: Array<{
    title: string;
    value: string;
    accent?: "green" | "blue" | "red" | "yellow" | "neutral" | "purple";
    icon?: any;
    hint?: string;
  }>;
}>();

const ACCENT_MAP = {
  green:
    "border-emerald-300/40 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100",
  blue: "border-sky-300/40 bg-sky-50 text-sky-950 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100",
  red: "border-rose-300/40 bg-rose-50 text-rose-950 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100",
  yellow:
    "border-amber-300/40 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100",
  purple:
    "border-violet-300/40 bg-violet-50 text-violet-950 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100",
  neutral: "border-outline-soft/70 bg-surface-soft text-foreground",
} as const;

type AccentKey = keyof typeof ACCENT_MAP;

function accentClass(accent?: AccentKey) {
  if (!accent) return ACCENT_MAP.neutral;
  return ACCENT_MAP[accent] ?? ACCENT_MAP.neutral;
}
</script>

<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
  {#each items as item}
    <Card class={`rounded-2xl border px-5 py-4 shadow-sm transition-all ${accentClass(item.accent)}`}>
      <CardHeader class="flex flex-row items-start justify-between gap-3 p-0">
        <div class="flex flex-col gap-1">
          <CardTitle class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {item.title}
          </CardTitle>
          <div class="text-2xl font-semibold tracking-tight text-foreground">
            {item.value}
          </div>
        </div>
        {#if item.icon}
          <span class="grid size-9 place-items-center rounded-xl border border-outline-soft/60 bg-background/80 text-muted-foreground shadow-sm">
            <item.icon class="size-4" />
          </span>
        {/if}
      </CardHeader>
      {#if item.hint}
        <CardContent class="mt-4 p-0 text-xs text-muted-foreground">
          {item.hint}
        </CardContent>
      {/if}
    </Card>
  {/each}
</div>
