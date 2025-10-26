<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";

let {
	open = $bindable(false),
	children,
	...props
} = $props<{
	open?: boolean;
	children: unknown;
	[key: string]: unknown;
}>();

const Root = DialogPrimitive.Root;
</script>

<Root bind:open {...props}>
  {@render children()}
</Root>
