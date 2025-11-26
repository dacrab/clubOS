<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLThAttributes } from "svelte/elements";

	type Props = HTMLThAttributes & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<th
	class={cn(
		"h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
