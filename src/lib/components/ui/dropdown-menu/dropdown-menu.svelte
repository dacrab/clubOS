<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<DropdownMenuPrimitive.Root bind:open {onOpenChange}>
	{@render children?.()}
</DropdownMenuPrimitive.Root>
