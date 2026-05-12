<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import Dialog from "$lib/components/ui/dialog/dialog.svelte";
	import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
	import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
	import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
	import DialogDescription from "$lib/components/ui/dialog/dialog-description.svelte";
	import DialogFooter from "$lib/components/ui/dialog/dialog-footer.svelte";

	type Props = {
		open: boolean;
		name: string;
		onconfirm: () => void;
		oncancel: () => void;
	};

	let { open = $bindable(), name, onconfirm, oncancel }: Props = $props();
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{t("common.delete")}</DialogTitle>
			<DialogDescription>{t("common.deleteConfirm").replace("{name}", name)}</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={oncancel}>{t("common.cancel")}</Button>
			<Button variant="destructive" onclick={onconfirm}>{t("common.delete")}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
