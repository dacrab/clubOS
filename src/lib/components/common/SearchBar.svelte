<script lang="ts">
import { Search } from "@lucide/svelte";
import { Badge } from "$lib/components/ui/badge";
import Input from "$lib/components/ui/input/input.svelte";

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
</script>

<div class="search-shell">
  {#if label || typeof count === "number" || badge}
    <div class="search-shell__header">
      {#if label}
        <span class="search-shell__label">{label}</span>
      {/if}
      <div class="search-shell__meta">
        {#if typeof count === "number"}
          <Badge variant="secondary" class="rounded-full px-2.5 py-0.5 text-xs font-medium">
            {count}
          </Badge>
        {/if}
        {#if badge}
          <Badge variant="outline" class="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {badge}
          </Badge>
        {/if}
      </div>
    </div>
  {/if}
  <div class="search-shell__field">
    <Search class="search-shell__icon" />
    <Input
      bind:value
      class="search-shell__input"
      placeholder={placeholder}
      aria-label={label ?? placeholder}
    />
  </div>
</div>
