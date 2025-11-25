<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: AlertDialogPrimitive.TitleProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	class={cn("text-lg font-semibold", className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialogPrimitive.Title>
