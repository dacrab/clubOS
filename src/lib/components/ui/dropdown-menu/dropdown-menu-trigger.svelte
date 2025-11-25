<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

let { ref = $bindable(null), ...restProps }: DropdownMenuPrimitive.TriggerProps = $props();
((..._args: unknown[]) => {
	return;
})(DropdownMenuPrimitive, ref, restProps);
</script>

<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...restProps} />
