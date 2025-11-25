<script lang="ts">
import { Separator as SeparatorPrimitive } from "bits-ui";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: SeparatorPrimitive.RootProps = $props();
((..._args: unknown[]) => {
	return;
})(SeparatorPrimitive, cn, ref, className, restProps);
</script>

<SeparatorPrimitive.Root
	bind:ref
	data-slot="separator"
	class={cn(
		"shrink-0 bg-border data-[orientation=horizontal]:h-[1px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[1px]",
		className
	)}
	{...restProps}
/>
