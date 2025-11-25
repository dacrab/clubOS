<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui";

const { ref = $bindable(null), ...restProps }: SelectPrimitive.GroupProps = $props();
((..._args: unknown[]) => {
	return;
})(SelectPrimitive, ref, restProps);
</script>

<SelectPrimitive.Group data-slot="select-group" {...restProps} />
