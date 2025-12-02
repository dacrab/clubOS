<script lang="ts">
	import { page } from "$app/state";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Home } from "@lucide/svelte";
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
	<div class="space-y-4">
		<div class="text-7xl font-bold text-primary">{page.status}</div>
		<h1 class="text-2xl font-semibold">
			{page.status === 404 ? t("errors.notFound.title") : t("errors.generic.title")}
		</h1>
		<p class="text-muted-foreground">
			{page.status === 404 ? t("errors.notFound.description") : t("errors.generic.description")}
		</p>
		<Button href="/">
			<Home class="mr-2 h-4 w-4" />
			{t("errors.goHome")}
		</Button>
	</div>
</div>
