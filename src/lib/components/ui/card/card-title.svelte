<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/cn";

type Props = HTMLAttributes<HTMLHeadingElement> & {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children, ...restProps }: Props = $props();
</script>

<h3 class={cn("font-semibold leading-none tracking-tight", className)} {...restProps}>
	{@render children?.()}
</h3>
