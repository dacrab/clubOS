<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";

let { ref = $bindable(null), ...restProps }: DialogPrimitive.TriggerProps = $props();
((..._args: unknown[]) => {
	return;
})(DialogPrimitive, ref, restProps);
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps} />
