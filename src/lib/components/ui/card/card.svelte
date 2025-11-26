<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLDivElement> & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<div
	class={cn(
		"rounded-lg border bg-card text-card-foreground shadow-sm",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
