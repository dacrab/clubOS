<script lang="ts">
	import { page } from "$app/stores";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { AlertTriangle, Home, RotateCcw } from "@lucide/svelte";

	const errorInfo = $derived.by(() => {
		if ($page.status === 404) return { title: t("errors.notFound.title"), desc: t("errors.notFound.description") };
		if ($page.status === 403 || $page.status === 401) return { title: t("errors.unauthorized.title"), desc: t("errors.unauthorized.description") };
		return { title: t("errors.generic.title"), desc: t("errors.generic.description") };
	});
</script>

<div class="flex min-h-[60vh] items-center justify-center p-4">
	<Card class="w-full max-w-md text-center">
		<CardHeader>
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
				<AlertTriangle class="h-8 w-8 text-destructive" />
			</div>
			<CardTitle class="text-2xl">{errorInfo.title}</CardTitle>
			<CardDescription>{errorInfo.desc}</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if $page.error?.message}
				<p class="text-sm text-muted-foreground rounded-lg bg-muted p-3 font-mono">
					{$page.error.message}
				</p>
			{/if}
			<div class="flex flex-col sm:flex-row gap-2 justify-center">
				<Button variant="outline" onclick={() => window.location.reload()}>
					<RotateCcw class="mr-2 h-4 w-4" />{t("common.retry")}
				</Button>
				<Button href="/admin">
					<Home class="mr-2 h-4 w-4" />{t("nav.dashboard")}
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
