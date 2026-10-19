<script lang="ts">
import Button from "#lib/components/ui/button/button.svelte";
import { t } from "#lib/i18n/index.svelte.js";
import { goto } from "$app/navigation";

type Props = { page: number; totalPages: number };
let { page, totalPages }: Props = $props();

const goToPage = (p: number) => {
	const url = new URL(window.location.href);
	url.searchParams.set("page", String(p));
	goto(url.pathname + url.search, { reset: false });
};
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-center gap-2">
		<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => goToPage(page - 1)}>
			{t("common.previous")}
		</Button>
		<span class="text-sm text-muted-foreground">{page} / {totalPages}</span>
		<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => goToPage(page + 1)}>
			{t("common.next")}
		</Button>
	</div>
{/if}
