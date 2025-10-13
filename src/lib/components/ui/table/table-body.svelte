<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";
import { cn } from "$lib/utils";

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLTableSectionElement>> = $props();
((..._args: unknown[]) => {
  return;
})(ref, className, children, restProps, cn);
</script>

<tbody
  bind:this={ref}
  data-slot="table-body"
  class={cn("[&_tr:last-child]:border-0", className)}
  {...restProps}
>
  {@render children?.()}
</tbody>
