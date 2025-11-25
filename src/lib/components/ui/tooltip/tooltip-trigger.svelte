<script lang="ts">
import { Tooltip as TooltipPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: TooltipPrimitive.TriggerProps & {
	children: Snippet;
} = $props();
</script>

<TooltipPrimitive.Trigger bind:ref class={cn(className)} {...restProps}>
	{@render children?.()}
</TooltipPrimitive.Trigger>
