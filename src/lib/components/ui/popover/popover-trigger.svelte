<script lang="ts">
import { Popover as PopoverPrimitive } from "bits-ui";

const { children, ...props } = $props<{
  children: unknown;
  [key: string]: unknown;
}>();

const Trigger = PopoverPrimitive.Trigger;
</script>

<Trigger {...props}>
    {@render children()}
</Trigger>
