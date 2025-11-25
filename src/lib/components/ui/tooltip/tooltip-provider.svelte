<script lang="ts">
import { Tooltip as TooltipPrimitive } from "bits-ui";
import type { Snippet } from "svelte";

let {
	delayDuration = 200,
	disableHoverableContent = false,
	children,
}: {
	delayDuration?: number;
	disableHoverableContent?: boolean;
	children: Snippet;
} = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {disableHoverableContent}>
	{@render children?.()}
</TooltipPrimitive.Provider>
