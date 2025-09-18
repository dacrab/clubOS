<script lang="ts">
 	import '../app.css';
 	import favicon from '$lib/assets/favicon.svg';
 	import { supabase } from '$lib/supabaseClient';
 	import { t, locale } from '$lib/i18n';
    import Button from '$lib/components/ui/button/button.svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    import { loadCurrentUser } from '$lib/user';

 	let { children } = $props();

 	async function logout() {
 		await supabase.auth.signOut();
 		window.location.href = '/login';
 	}

    $effect(() => {
        loadCurrentUser();
    });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen">
    <Sidebar />
    <div class="flex-1 pl-64">
        <header class="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
                <div class="flex-1"></div>
                <select bind:value={$locale} class="border p-1 rounded">
                    <option value="en">EN</option>
                    <option value="el">EL</option>
                </select>
                <Button variant="outline" onclick={logout}>{t('nav.logout')}</Button>
            </div>
        </header>

        <main class="max-w-6xl mx-auto px-4 py-4">
            {@render children?.()}
        </main>
    </div>
</div>
