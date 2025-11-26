<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";
	import { ChevronDown } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		placeholder?: string;
		selected?: string;
		children?: Snippet;
	};

	let { class: className = "", placeholder = "Select...", selected, children }: Props = $props();
</script>

<SelectPrimitive.Trigger>
	{#snippet child({ props })}
		<div
			{...props}
			role="combobox"
			tabindex="0"
			class={cn(
				"flex h-9 w-full cursor-pointer items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
				className
			)}
		>
			<span class="pointer-events-none flex-1 truncate text-left {!selected && !children ? 'text-muted-foreground' : ''}">
				{#if children}
					{@render children()}
				{:else if selected}
					{selected}
				{:else}
					{placeholder}
				{/if}
			</span>
			<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
		</div>
	{/snippet}
</SelectPrimitive.Trigger>
