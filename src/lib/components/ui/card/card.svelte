<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

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
	data-slot="card"
	class={cn(
		"bg-card text-card-foreground rounded-xl border shadow-sm",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
