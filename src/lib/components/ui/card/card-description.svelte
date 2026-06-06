<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/cn";

type Props = HTMLAttributes<HTMLParagraphElement> & {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children, ...restProps }: Props = $props();
</script>

<p class={cn("text-sm text-muted-foreground", className)} {...restProps}>
	{@render children?.()}
</p>
