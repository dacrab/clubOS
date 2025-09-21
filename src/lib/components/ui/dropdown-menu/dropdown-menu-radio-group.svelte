<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

let {
  ref = $bindable<HTMLElement | null>(null),
  value = $bindable<string>(""),
  ...restProps
}: DropdownMenuPrimitive.RadioGroupProps = $props();
</script>

<DropdownMenuPrimitive.RadioGroup
	bind:ref
	bind:value
	data-slot="dropdown-menu-radio-group"
	{...restProps}
/>
