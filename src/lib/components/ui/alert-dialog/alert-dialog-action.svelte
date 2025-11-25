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
}: AlertDialogPrimitive.ActionProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	class={cn(buttonVariants(), className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialogPrimitive.Action>
