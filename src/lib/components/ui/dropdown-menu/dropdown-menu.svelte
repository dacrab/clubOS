<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

const { children, ...props } = $props<{
  children: unknown;
  [key: string]: unknown;
}>();

const Root = DropdownMenuPrimitive.Root;
</script>

<Root {...props}>
    {@render children()}
</Root>
