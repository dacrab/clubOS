<script lang="ts">
import CheckIcon from "@lucide/svelte/icons/check";
import MinusIcon from "@lucide/svelte/icons/minus";
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import type { WithoutChildrenOrChild } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	checked = $bindable(false),
	indeterminate = $bindable(false),
	class: className,
	children: childrenProp,
	...restProps
}: WithoutChildrenOrChild<DropdownMenuPrimitive.CheckboxItemProps> & {
	children?: Snippet<[]>;
} = $props();
((..._args: unknown[]) => {
	return;
})(
	CheckIcon,
	MinusIcon,
	DropdownMenuPrimitive,
	cn,
	ref,
	checked,
	indeterminate,
	className,
	childrenProp,
	restProps,
);
</script>

<DropdownMenuPrimitive.CheckboxItem
	bind:ref
	bind:checked
	bind:indeterminate
	data-slot="dropdown-menu-checkbox-item"
	class={cn(
		"focus:outline-hidden data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:border-accent/50 hover:bg-muted gap-2 rounded-sm border px-2 py-1.5 text-sm outline-none transition-colors",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
			{#if indeterminate}
				<MinusIcon class="size-4" />
			{:else}
				<CheckIcon class={cn("size-4", !checked && "text-transparent")} />
			{/if}
		</span>
		{@render childrenProp?.()}
	{/snippet}
</DropdownMenuPrimitive.CheckboxItem>
