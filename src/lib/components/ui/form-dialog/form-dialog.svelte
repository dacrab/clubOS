<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "$lib/components/ui/dialog";
	import type { Snippet } from "svelte";

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		saving?: boolean;
		children: Snippet;
		onsubmit: () => void;
		onclose: () => void;
	};

	let { open = $bindable(), title, description, saving = false, children, onsubmit, onclose }: Props = $props();
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			{#if description}<DialogDescription>{description}</DialogDescription>{/if}
		</DialogHeader>
		<form onsubmit={(e) => { e.preventDefault(); onsubmit(); }} class="space-y-4">
			{@render children()}
			<DialogFooter>
				<Button type="button" variant="outline" onclick={onclose}>{t("common.cancel")}</Button>
				<Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
