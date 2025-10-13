<script lang="ts">
import type { HTMLTdAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";
import { cn } from "$lib/utils";

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLTdAttributes> = $props();
((..._args: unknown[]) => {
  return;
})(ref, className, children, restProps, cn);
</script>

<td
	bind:this={ref}
	data-slot="table-cell"
	class={cn(
		"whitespace-nowrap bg-clip-padding p-2 align-middle [&:has([role=checkbox])]:pr-0",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</td>
