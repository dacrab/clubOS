<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";

let {
	open = $bindable(false),
	children,
	...restProps
}: AlertDialogPrimitive.RootProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</AlertDialogPrimitive.Root>
