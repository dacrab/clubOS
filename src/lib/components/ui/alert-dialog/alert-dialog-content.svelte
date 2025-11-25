<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/utils";
import AlertDialogOverlay from "./alert-dialog-overlay.svelte";

let {
	ref = $bindable(null),
	class: className,
	children,
	...restProps
}: AlertDialogPrimitive.ContentProps & {
	children: Snippet;
} = $props();
</script>

<AlertDialogPrimitive.Portal>
	<AlertDialogOverlay />
	<AlertDialogPrimitive.Content
		bind:ref
		class={cn(
			"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200",
			"data-[state=open]:animate-in data-[state=closed]:animate-out",
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
			"sm:rounded-lg",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
