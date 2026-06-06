<script lang="ts">
import { toast } from "svelte-sonner";
import { t } from "$lib/i18n/index.svelte";
import { supabase } from "$lib/utils/supabase";

type Props = {
	bucket: string;
	onUpload: (url: string) => void;
	currentUrl?: string;
};

let { bucket, onUpload, currentUrl = "" }: Props = $props();
let uploading = $state(false);
let uploadedUrl = $state("");
let preview = $derived(uploadedUrl || currentUrl);

async function handleFile(e: Event): Promise<void> {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (!file) return;
	uploading = true;
	try {
		const path = `${crypto.randomUUID()}-${file.name}`;
		const { error } = await supabase.storage.from(bucket).upload(path, file);
		if (error) throw error;
		const { data } = supabase.storage.from(bucket).getPublicUrl(path);
		uploadedUrl = data.publicUrl;
		onUpload(data.publicUrl);
	} catch (err) {
		toast.error(err instanceof Error ? err.message : t("common.error"));
	} finally {
		uploading = false;
	}
}
</script>

<div class="space-y-2">
	{#if preview}
		<img src={preview} alt="Preview" class="h-24 w-24 rounded object-cover" />
	{/if}
	<input type="file" accept="image/*" onchange={handleFile} disabled={uploading} class="text-sm" />
	{#if uploading}<span class="text-xs text-muted-foreground">{t("common.loading")}</span>{/if}
</div>
