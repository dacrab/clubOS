<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { supabase } from '$lib/supabaseClient';
	import { t, locale } from '$lib/i18n';

	let { children } = $props();

	async function logout() {
		await supabase.auth.signOut();
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="p-3 flex items-center gap-3 border-b">
	<nav class="flex-1 flex items-center gap-4">
		<a href="/dashboard">Dashboard</a>
		<a href="/orders">{t('nav.orders')}</a>
		<a href="/admin">Admin</a>
		<a href="/admin/products">Products</a>
		<a href="/admin/categories">Categories</a>
		<a href="/admin/users">Users</a>
		<a href="/secretary/appointments">Appointments</a>
		<a href="/secretary/football">Football</a>
	</nav>
	<select bind:value={$locale} class="border p-1 rounded">
		<option value="en">EN</option>
		<option value="el">EL</option>
	</select>
	<button class="border rounded px-3 py-1" onclick={logout}>{t('nav.logout')}</button>
</header>

<main>
    {@render children?.()}
</main>
