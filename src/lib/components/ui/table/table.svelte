<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLTableAttributes } from "svelte/elements";

	type Props = HTMLTableAttributes & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<div class="relative w-full overflow-auto">
	<table class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
