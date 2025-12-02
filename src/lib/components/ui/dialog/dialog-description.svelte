<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children }: Props = $props();
</script>

<DialogPrimitive.Description class={cn("text-sm text-muted-foreground", className)}>
	{@render children?.()}
</DialogPrimitive.Description>
