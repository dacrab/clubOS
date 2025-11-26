<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children }: Props = $props();
</script>

<div class={cn("px-2 py-1.5 text-sm font-semibold", className)}>
	{@render children?.()}
</div>
