<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: AlertDialogPrimitive.DescriptionProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Description
	bind:ref
	class={cn("text-sm text-muted-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialogPrimitive.Description>
