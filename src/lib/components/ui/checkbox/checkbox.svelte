<script lang="ts">
import CheckIcon from "@lucide/svelte/icons/check";
import MinusIcon from "@lucide/svelte/icons/minus";
import { Checkbox as CheckboxPrimitive } from "bits-ui";
import type { WithoutChildrenOrChild } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	checked = $bindable(false),
	indeterminate = $bindable(false),
	class: className,
	...restProps
}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
((..._args: unknown[]) => {
	return;
})(cn, CheckIcon, MinusIcon, CheckboxPrimitive, ref, checked, indeterminate, className, restProps);
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={cn(
		"peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
		className
	)}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div data-slot="checkbox-indicator" class="flex items-center justify-center text-current transition-none">
			{#if checked}
				<CheckIcon class="size-3.5" />
			{:else if indeterminate}
				<MinusIcon class="size-3.5" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
