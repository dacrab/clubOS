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

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn(
    "[&_tr]:border-b [&_tr:hover>th]:bg-transparent [&_tr:hover>td]:bg-transparent",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</thead>
