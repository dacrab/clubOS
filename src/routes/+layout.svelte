<script lang="ts">
import "../app.css";
import { injectAnalytics } from "@vercel/analytics/sveltekit";
import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";
import { dev } from "$app/environment";
import favicon from "$lib/assets/favicon.svg";
import Sonner from "$lib/components/ui/sonner/sonner.svelte";

const { children } = $props();

injectAnalytics({ mode: dev ? "development" : "production" });
injectSpeedInsights();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>clubOS</title>
</svelte:head>

<Sonner richColors expand closeButton />
{@render children()}
