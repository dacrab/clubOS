<script lang="ts">
import { Tooltip as TooltipPrimitive } from "bits-ui";
import type { Snippet } from "svelte";

let {
	open = $bindable(false),
	delayDuration,
	children,
}: {
	open?: boolean;
	delayDuration?: number;
	children: Snippet;
} = $props();
</script>

<TooltipPrimitive.Root bind:open {delayDuration}>
	{@render children?.()}
</TooltipPrimitive.Root>
