<script lang="ts">
	import "../app.css";
	import Sonner from "$lib/components/ui/sonner/sonner.svelte";
	import { browser } from "$app/environment";
	import favicon from "$lib/assets/favicon.svg";
	import { theme } from "$lib/state/theme.svelte";

	const { children } = $props();

	$effect(() => {
		if (browser) {
			// Apply theme on mount and changes
			const root = document.documentElement;
			if (theme.isDark) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>clubOS</title>
</svelte:head>

<Sonner richColors expand closeButton />
{@render children()}
