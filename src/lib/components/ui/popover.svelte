<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui";

let {
  open = $bindable(false),
  children,
  ...props
} = $props<{
  open?: boolean;
  children: unknown;
  [key: string]: unknown;
}>();

const Root = PopoverPrimitive.Root;
</script>

<Root bind:open {...props}>
  {@render children()}
</Root>
