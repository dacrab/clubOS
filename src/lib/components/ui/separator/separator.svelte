<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLDivElement> & {
		orientation?: "horizontal" | "vertical";
		class?: string;
	};

	let { orientation = "horizontal", class: className = "", ...restProps }: Props = $props();
</script>

<div
	role="separator"
	class={cn(
		"shrink-0 bg-border",
		orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
		className
	)}
	{...restProps}
></div>
