<script lang="ts">
import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
import { cn } from "$lib/utils";

let {
	ref = $bindable(null),
	class: className,
	value = $bindable(""),
	...restProps
}: RadioGroupPrimitive.RootProps = $props();
((..._args: unknown[]) => {
	return;
})(RadioGroupPrimitive, cn, ref, className, value, restProps);
</script>

<RadioGroupPrimitive.Root
	bind:ref
	bind:value
	data-slot="radio-group"
	class={cn("grid gap-3", className)}
	{...restProps}
/>
