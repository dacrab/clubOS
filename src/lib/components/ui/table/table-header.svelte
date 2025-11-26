<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLTableSectionElement> & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)} {...restProps}>
	{@render children?.()}
</thead>
