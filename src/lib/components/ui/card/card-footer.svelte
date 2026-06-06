<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
	class?: string;
	children?: Snippet;
};

let { class: className = "", children, ...restProps }: Props = $props();
</script>

<div class={cn("flex items-center p-6 pt-0", className)} {...restProps}>
	{@render children?.()}
</div>
