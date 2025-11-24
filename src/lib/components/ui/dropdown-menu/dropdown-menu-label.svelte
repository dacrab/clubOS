<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	inset,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
	inset?: boolean;
} = $props();
((..._args: unknown[]) => {
	return;
})(ref, className, inset, children, restProps, cn);
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu-label"
	data-inset={inset}
	class={cn("px-2 py-1.5 text-sm font-semibold data-[inset]:pl-8", className)}
	{...restProps}
>
	{@render children?.()}
</div>
