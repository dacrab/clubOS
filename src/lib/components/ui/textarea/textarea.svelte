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
		"flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
    bind:value
	{...restProps}
></textarea>
