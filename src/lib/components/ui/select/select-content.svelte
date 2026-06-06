<script lang="ts">
import { Select as SelectPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { cn } from "$lib/utils/cn";

type Props = {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children }: Props = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		class={cn(
			"popover-anim relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
			className
		)}
		sideOffset={4}
	>
		<SelectPrimitive.Viewport class="p-1">
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
