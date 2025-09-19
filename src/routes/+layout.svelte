<script lang="ts">
 	import '../app.css';
 	import favicon from '$lib/assets/favicon.svg';
 	import Sidebar from '$lib/components/Sidebar.svelte';
 	import { loadCurrentUser } from '$lib/user';
 	import { Toaster } from 'svelte-sonner';

 	let { children } = $props();

 	let isLoginPage = $state(false);

 	$effect(() => {
 		if (typeof window !== 'undefined') {
 			isLoginPage = window.location.pathname === '/';
 			if (!isLoginPage) loadCurrentUser();
 		}
 	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-[radial-gradient(ellipse_at_top,theme(colors.chart-2/.15),transparent_60%),radial-gradient(ellipse_at_bottom,theme(colors.chart-1/.12),transparent_60%)]">
    <Toaster richColors position="top-center" />
    {#if !isLoginPage}
    <div class="flex min-h-screen">
        <Sidebar />
        <div class="flex-1 pl-64">
            <header class="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
                    <div class="flex-1 font-medium tracking-tight">clubOS</div>
                </div>
            </header>

            <main class="max-w-6xl mx-auto px-4 py-4">
                {@render children?.()}
            </main>
        </div>
    </div>
    {:else}
        <main class="max-w-6xl mx-auto px-4 py-10">
            {@render children?.()}
        </main>
    {/if}
</div>
