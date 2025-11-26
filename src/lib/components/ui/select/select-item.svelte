<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";
	import { Check } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = {
		value: string;
		label?: string;
		disabled?: boolean;
		class?: string;
		children?: Snippet;
	};

	let { value, label, disabled = false, class: className = "", children: childrenSnippet }: Props = $props();
</script>

<SelectPrimitive.Item
	{value}
	label={label ?? value}
	{disabled}
	class={cn(
		"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
>
	{#snippet children({ selected })}
		<span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if selected}
				<Check class="h-4 w-4" />
			{/if}
		</span>
		{#if childrenSnippet}
			{@render childrenSnippet()}
		{:else}
			{label ?? value}
		{/if}
	{/snippet}
</SelectPrimitive.Item>
