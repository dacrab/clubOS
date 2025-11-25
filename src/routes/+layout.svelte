<script lang="ts">
import "../app.css";
import { Toaster } from "svelte-sonner";
import { browser } from "$app/environment";
import favicon from "$lib/assets/favicon.svg";
import { userState } from "$lib/state/user.svelte";
import { TooltipProvider } from "$lib/components/ui/tooltip";

const { children } = $props();

// Theme initialization
if (browser) {
	const stored = window.localStorage.getItem("theme");
	const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
	const root = document.documentElement;
	const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

	if (theme === "dark" || (theme === "system" && systemDark)) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

$effect(() => {
	if (browser) {
		// Load user state globally if needed, or rely on (app) layout
		userState.load();
	}
});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>clubOS</title>
</svelte:head>

<Toaster richColors position="top-center" />
<TooltipProvider>
	{@render children()}
</TooltipProvider>
