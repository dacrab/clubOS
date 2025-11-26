<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		disabled?: boolean;
		onSelect?: () => void;
		children?: Snippet;
	};

	let { class: className = "", disabled = false, onSelect, children }: Props = $props();
</script>

<DropdownMenuPrimitive.Item
	{disabled}
	{onSelect}
	class={cn(
		"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
		className
	)}
>
	{@render children?.()}
</DropdownMenuPrimitive.Item>
