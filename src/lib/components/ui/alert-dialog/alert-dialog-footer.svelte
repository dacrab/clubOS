<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { cn } from "$lib/utils/utils";

let {
	class: className,
	children,
	...restProps
}: HTMLAttributes<HTMLDivElement> & {
	children: Snippet;
} = $props();
</script>

<div
	class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
	{...restProps}
>
	{@render children?.()}
</div>
