<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: AlertDialogPrimitive.TriggerProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Trigger bind:ref class={cn(className)} {...restProps}>
	{@render children?.()}
</AlertDialogPrimitive.Trigger>
