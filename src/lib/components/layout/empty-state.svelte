<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import { Package } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		description?: string;
		icon?: typeof Package;
		class?: string;
		actions?: Snippet;
	};

	let { title, description, icon: Icon = Package, class: className = "", actions }: Props = $props();
</script>

<div class={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
	<div class="mb-4 rounded-full bg-muted p-4">
		<Icon class="h-8 w-8 text-muted-foreground" />
	</div>
	<h3 class="mb-1 text-lg font-semibold">{title}</h3>
	{#if description}
		<p class="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
