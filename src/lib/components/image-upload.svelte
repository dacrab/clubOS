<script lang="ts">
import { toast } from "svelte-sonner";
import { t } from "$lib/i18n/index.svelte";

type Props = {
	onUpload: (url: string) => void;
	currentUrl?: string;
};

let { onUpload, currentUrl = "" }: Props = $props();
let uploading = $state(false);
let uploadedUrl = $state("");
let preview = $derived(uploadedUrl || currentUrl);

function handleFile(e: Event): void {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	if (file.size > 500_000) {
		toast.error(t("products.imageTooLarge"));
		input.value = "";
		return;
	}
	uploading = true;
	const reader = new FileReader();
	reader.onload = () => {
		uploadedUrl = typeof reader.result === "string" ? reader.result : "";
		onUpload(uploadedUrl);
		uploading = false;
	};
	reader.onerror = () => {
		toast.error(t("common.error"));
		uploading = false;
	};
	reader.readAsDataURL(file);
}
</script>

<div class="space-y-2">
	{#if preview}
		<img src={preview} alt="Preview" class="h-24 w-24 rounded object-cover" />
	{/if}
	<input type="file" accept="image/*" onchange={handleFile} disabled={uploading} class="text-sm" />
	<p class="text-xs text-muted-foreground">{t("products.imageStoredInline")}</p>
	{#if uploading}<span class="text-xs text-muted-foreground">{t("common.loading")}</span>{/if}
</div>
