<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui";

let {
	value = $bindable(),
	children,
	...props
} = $props<{
	value?: unknown;
	children: unknown;
	[key: string]: unknown;
}>();

const Root = SelectPrimitive.Root;
</script>

<Root bind:value {...props}>
  {@render children()}
</Root>
