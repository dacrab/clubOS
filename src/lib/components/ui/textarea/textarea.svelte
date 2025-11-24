<script lang="ts">
import type { HTMLTextareaAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils/utils";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	value = $bindable(),
	class: className,
	children,
	...restProps
}: WithElementRef<HTMLTextareaAttributes> & { value?: string } = $props();
((..._args: unknown[]) => {
	return;
})(ref, value, className, children, restProps, cn);
</script>

<textarea
	bind:this={ref}
	data-slot="textarea"
    class={cn(
		"border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 shadow-xs flex min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
    bind:value
	{...restProps}
></textarea>
