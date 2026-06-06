<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/cn";

type Props = HTMLAttributes<HTMLTableRowElement> & {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children, ...restProps }: Props = $props();
</script>

<tr
	class={cn(
		"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
