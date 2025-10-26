<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";
import { cn } from "$lib/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
((..._args: unknown[]) => {
	return;
})(cn, ref, className, children, restProps);
</script>

<div
	bind:this={ref}
	data-slot="dialog-footer"
	class={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
	{...restProps}
>
	{@render children?.()}
</div>
