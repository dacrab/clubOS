<script lang="ts">
import Header from "$lib/components/layout/header.svelte";
import Sidebar from "$lib/components/layout/sidebar.svelte";
import { sidebarState } from "$lib/state/sidebar.svelte";

const { children } = $props();
</script>

<div class="flex min-h-screen bg-background">
	<Sidebar />
	<div 
		class="flex flex-1 flex-col transition-[margin] duration-200 ease-in-out"
		style="margin-left: {sidebarState.collapsed ? '4rem' : '16rem'}"
	>
		<Header />
		<main class="flex-1 p-6 md:p-8 animate-in fade-in duration-300">
			<div class="mx-auto max-w-6xl">
				{@render children()}
			</div>
		</main>
	</div>
</div>
