<script lang="ts" module>
	export { default as TableBody } from "./table-body.svelte";
	export { default as TableCell } from "./table-cell.svelte";
	export { default as TableHead } from "./table-head.svelte";
	export { default as TableHeader } from "./table-header.svelte";
	export { default as TableRow } from "./table-row.svelte";
</script>

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
