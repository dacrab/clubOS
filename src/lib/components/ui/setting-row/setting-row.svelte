<script lang="ts">
	import Label from "$lib/components/ui/label/label.svelte";
	import type { Snippet } from "svelte";

	type Props = {
		id?: string;
		label: string;
		description?: string;
		children: Snippet;
	};

	let { id, label, description, children }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<div>
		<Label for={id}>{label}</Label>
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
	</div>
	{@render children()}
</div>
