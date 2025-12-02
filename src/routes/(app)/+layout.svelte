<script lang="ts">
	import { Sidebar, Header } from "$lib/components/layout";
	import { session } from "$lib/state/session.svelte";
	import { settings } from "$lib/state/settings.svelte";

	const { data, children } = $props();

	// Initialize session and settings from server data
	$effect(() => {
		if (data.user) {
			session.setUser(data.user);
		}
		if (data.settings) {
			settings.setSettings(data.settings);
		}
	});
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar />
	<div class="flex flex-1 flex-col">
		<Header />
		<main class="flex-1 p-4 md:p-6">
			<div class="mx-auto max-w-7xl">
				{@render children()}
			</div>
		</main>
	</div>
</div>
