<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/cn";

type Props = HTMLAttributes<HTMLTableSectionElement> & {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children, ...restProps }: Props = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)} {...restProps}>
	{@render children?.()}
</tbody>
