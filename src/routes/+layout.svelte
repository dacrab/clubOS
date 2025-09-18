<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { supabase } from '$lib/supabaseClient';
	import { t, locale } from '$lib/i18n';
    import Button from '$lib/components/ui/button/button.svelte';

	let { children } = $props();

	async function logout() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
	<div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
		<nav class="flex-1 flex items-center gap-2 text-sm">
			<Button variant="ghost" href="/dashboard">Dashboard</Button>
			<Button variant="ghost" href="/orders">{t('nav.orders')}</Button>
			<Button variant="ghost" href="/admin">Admin</Button>
			<Button variant="ghost" href="/admin/products">Products</Button>
			<Button variant="ghost" href="/admin/categories">Categories</Button>
			<Button variant="ghost" href="/admin/users">Users</Button>
			<Button variant="ghost" href="/secretary/appointments">Appointments</Button>
			<Button variant="ghost" href="/secretary/football">Football</Button>
		</nav>
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
