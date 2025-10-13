<script lang="ts">
import { Tabs as TabsPrimitive } from "bits-ui";
import { cn } from "$lib/utils";

let {
  ref = $bindable(null),
  value = $bindable(""),
  class: className,
  ...restProps
}: TabsPrimitive.RootProps = $props();
((..._args: unknown[]) => {
  return;
})(TabsPrimitive, cn, ref, value, className, restProps);
</script>

<TabsPrimitive.Root
	bind:ref
	bind:value
	data-slot="tabs"
	class={cn("flex flex-col gap-2", className)}
	{...restProps}
/>
