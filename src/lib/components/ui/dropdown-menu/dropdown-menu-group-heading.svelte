<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils";

let {
	ref = $bindable(null),
	class: className,
	inset = false,
	children,
	...restProps
}: {
	ref?: HTMLElement | null;
	class?: string;
	inset?: boolean;
	children?: Snippet;
} & Record<string, unknown> = $props();
((..._args: unknown[]) => {
	return;
})(DropdownMenuPrimitive, cn, ref, className, inset, children, restProps);
</script>

<DropdownMenuPrimitive.GroupHeading
	bind:ref
	data-slot="dropdown-menu-group-heading"
	class={cn("px-2 py-1.5 text-xs font-semibold text-foreground/50", inset && "pl-8", className)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.GroupHeading>
