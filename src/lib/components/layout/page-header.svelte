<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		description?: string;
		class?: string;
		actions?: Snippet;
	};

	let { title, description, class: className = "", actions }: Props = $props();
</script>

<div class={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
	<div class="space-y-1">
		<h1 class="text-2xl font-bold tracking-tight">{title}</h1>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
