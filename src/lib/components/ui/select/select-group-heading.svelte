<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils";

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: { ref?: HTMLElement | null; class?: string; children?: Snippet } & Record<
  string,
  unknown
> = $props();
((..._args: unknown[]) => {
  return;
})(SelectPrimitive, cn, ref, className, children, restProps);
</script>

<SelectPrimitive.GroupHeading
	bind:ref
	data-slot="select-group-heading"
	class={cn("px-2 py-1.5 text-xs font-semibold text-foreground/50", className)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.GroupHeading>
