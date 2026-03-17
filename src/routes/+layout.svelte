<script lang="ts">
	import "../app.css";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";
	import Sonner from "$lib/components/ui/sonner/sonner.svelte";
	import { dev } from "$app/environment";
	import favicon from "$lib/assets/favicon.svg";

	const { children } = $props();

	injectAnalytics({ mode: dev ? "development" : "production" });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>clubOS</title>
</svelte:head>

<Sonner richColors expand closeButton />
{@render children()}
