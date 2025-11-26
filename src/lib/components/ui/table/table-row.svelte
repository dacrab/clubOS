<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLTableRowElement> & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<tr
	class={cn(
		"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
