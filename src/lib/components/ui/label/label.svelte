<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";

	type Props = {
		for?: string;
		class?: string;
		children?: Snippet;
	};

	let { for: htmlFor, class: className = "", children }: Props = $props();
</script>

<LabelPrimitive.Root
	for={htmlFor}
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className
	)}
>
	{@render children?.()}
</LabelPrimitive.Root>
