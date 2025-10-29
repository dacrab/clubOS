<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";
import { cn } from "$lib/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
((..._args: unknown[]) => {
	return;
})(ref, className, children, restProps, cn);
</script>

<span
	bind:this={ref}
	data-slot="dropdown-menu-shortcut"
    class={cn("text-muted-foreground ml-auto text-xs", className)}
	{...restProps}
>
	{@render children?.()}
</span>
