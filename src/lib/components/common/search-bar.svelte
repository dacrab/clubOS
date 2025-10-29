<script lang="ts">
import { Search } from "@lucide/svelte";
import Badge from "$lib/components/ui/badge/badge.svelte";
import Input from "$lib/components/ui/input/input.svelte";

((..._args: unknown[]) => {
	return;
})(Search, Badge, Input);

let {
	value = $bindable(""),
	placeholder = "Search...",
	label,
	count,
	badge,
} = $props<{
	value: string;
	placeholder?: string;
	label?: string;
	count?: number;
	badge?: string;
}>();
// Mark as used for Biome (used in Svelte markup)
((..._args: unknown[]) => {
	return;
})(value, placeholder, label, count, badge);
</script>

<div class="flex flex-col gap-3">
  {#if label || typeof count === "number" || badge}
    <div class="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
      {#if label}
        <span class="uppercase text-muted-foreground/80">{label}</span>
      {/if}
      <div class="flex items-center gap-1.5">
        {#if typeof count === "number"}
          <Badge variant="secondary" class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase">
            {count}
          </Badge>
        {/if}
        {#if badge}
          <Badge variant="outline" class="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {badge}
          </Badge>
        {/if}
      </div>
    </div>
  {/if}
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
    <Input
      bind:value
      class="h-11 w-full rounded-2xl border border-outline-soft/70 bg-background/90 pl-10 pr-4 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-0"
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      autocomplete="off"
    />
  </div>
</div>
