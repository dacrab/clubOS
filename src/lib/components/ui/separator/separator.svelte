<script lang="ts">
	import { Separator as SeparatorPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";

	type Props = {
		orientation?: "horizontal" | "vertical";
		class?: string;
	};

	let { orientation = "horizontal", class: className = "" }: Props = $props();
</script>

<SeparatorPrimitive.Root
	{orientation}
	class={cn(
		"shrink-0 bg-border",
		orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
		className
	)}
/>
