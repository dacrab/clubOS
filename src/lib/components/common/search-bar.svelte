<script lang="ts">
import { Search } from "@lucide/svelte";
import { Input } from "$lib/components/ui/input";

let {
	value = $bindable(""),
	placeholder = "Search...",
	class: className = "",
} = $props<{
	value: string;
	placeholder?: string;
	class?: string;
}>();
</script>

<div class={`relative ${className}`}>
	<Search
		class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<Input
		bind:value
		class="pl-9 bg-background border-border/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 h-9"
		{placeholder}
		autocomplete="off"
	/>
</div>
