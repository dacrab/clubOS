<script lang="ts" module>
	export { default as CardContent } from "./card-content.svelte";
	export { default as CardDescription } from "./card-description.svelte";
	export { default as CardFooter } from "./card-footer.svelte";
	export { default as CardHeader } from "./card-header.svelte";
	export { default as CardTitle } from "./card-title.svelte";
</script>

<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = HTMLAttributes<HTMLDivElement> & {
		class?: string;
		children?: Snippet;
	};

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<div class={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...restProps}>
	{@render children?.()}
</div>
