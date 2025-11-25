<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";
import { buttonVariants } from "$lib/components/ui/button";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: AlertDialogPrimitive.CancelProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Cancel
	bind:ref
	class={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialogPrimitive.Cancel>
