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
    "border-green-200/60 bg-green-50 text-foreground dark:border-emerald-900/40 dark:bg-emerald-950/50 dark:text-emerald-100",
  blue: "border-blue-200/60 bg-blue-50 text-foreground dark:border-sky-900/40 dark:bg-sky-950/50 dark:text-sky-100",
  red: "border-red-200/60 bg-rose-50 text-foreground dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-100",
  yellow:
    "border-amber-200/60 bg-amber-50 text-foreground dark:border-amber-900/40 dark:bg-amber-950/50 dark:text-amber-100",
  purple:
    "border-violet-200/60 bg-violet-50 text-foreground dark:border-violet-900/40 dark:bg-violet-950/50 dark:text-violet-100",
  neutral: "border-outline-soft bg-surface text-foreground",
} as const;

type AccentKey = keyof typeof ACCENT_MAP;

function accentClass(accent?: AccentKey) {
  if (!accent) return ACCENT_MAP.neutral;
  return ACCENT_MAP[accent] ?? ACCENT_MAP.neutral;
}
</script>

<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
  {#each items as item}
    <Card class={`rounded-xl border ${accentClass(item.accent)}`}>
      <CardHeader class="flex flex-row items-start justify-between gap-2 pb-1">
        <div class="flex flex-col gap-1">
          <CardTitle class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.title}
          </CardTitle>
          <div class="text-xl font-semibold tracking-tight text-foreground">
            {item.value}
          </div>
        </div>
        {#if item.icon}
          <span class="grid size-7 place-items-center rounded-full border border-outline-soft/50 bg-white/80 text-muted-foreground shadow-sm backdrop-blur">
            <item.icon class="size-3.5" />
          </span>
        {/if}
      </CardHeader>
      {#if item.hint}
        <CardContent class="pt-0 text-xs text-muted-foreground">
          {item.hint}
        </CardContent>
      {/if}
    </Card>
  {/each}
</div>
