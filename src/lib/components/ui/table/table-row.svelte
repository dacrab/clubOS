<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
((..._args: unknown[]) => {
	return;
})(ref, className, children, restProps, cn);
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		"data-[state=selected]:bg-muted border-b transition-colors",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
