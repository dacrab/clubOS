<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import Button from "$lib/components/ui/button/button.svelte";

	type Props = { page: number; totalPages: number };
	let { page, totalPages }: Props = $props();

	const goto = (p: number) => {
		const url = new URL(window.location.href);
		url.searchParams.set("page", String(p));
		window.location.href = url.toString();
	};
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-center gap-2">
		<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => goto(page - 1)}>
			{t("common.previous")}
		</Button>
		<span class="text-sm text-muted-foreground">{page} / {totalPages}</span>
		<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => goto(page + 1)}>
			{t("common.next")}
		</Button>
	</div>
{/if}
