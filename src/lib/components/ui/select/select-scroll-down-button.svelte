<script lang="ts">
import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
import { Select as SelectPrimitive } from "bits-ui";
import type { WithoutChildrenOrChild } from "$lib/utils";
import { cn } from "$lib/utils";

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
((..._args: unknown[]) => {
	return;
})(ChevronDownIcon, SelectPrimitive, cn, ref, className, restProps);
</script>

<SelectPrimitive.ScrollDownButton
	bind:ref
	data-slot="select-scroll-down-button"
	class={cn("flex cursor-default items-center justify-center py-1", className)}
	{...restProps}
>
	<ChevronDownIcon class="size-4" />
</SelectPrimitive.ScrollDownButton>
