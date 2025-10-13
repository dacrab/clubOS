<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";
import { cn } from "$lib/utils";

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
((..._args: unknown[]) => {
  return;
})(ref, className, children, restProps, cn);
</script>

<caption
	bind:this={ref}
	data-slot="table-caption"
	class={cn("text-muted-foreground mt-4 text-sm", className)}
	{...restProps}
>
	{@render children?.()}
</caption>
