<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";

let { ref = $bindable(null), ...restProps }: DialogPrimitive.CloseProps = $props();
((..._args: unknown[]) => {
	return;
})(DialogPrimitive, ref, restProps);
</script>

<DialogPrimitive.Close bind:ref data-slot="dialog-close" {...restProps} />
