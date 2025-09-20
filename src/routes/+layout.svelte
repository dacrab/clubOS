<script lang="ts">
 	import '../app.css';
 	import favicon from '$lib/assets/favicon.svg';
 	import Sidebar from '$lib/components/Sidebar.svelte';
 	import { loadCurrentUser, currentUser } from '$lib/user';
 	import { Toaster } from 'svelte-sonner';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import { page } from '$app/stores';

 	let { children } = $props();

  let theme = $state<'light'|'dark'>('dark');
  let isLoginPage = $derived(() => $page.url.pathname === '/');

	const toggleTheme = () => {
		const next = theme === 'dark' ? 'light' : 'dark';
		theme = next;
		const root = document.documentElement;
		if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
		window.localStorage.setItem('theme', theme);
	};

 	$effect(() => {
    if (typeof window !== 'undefined') {
      if (!isLoginPage) loadCurrentUser();
      // initialize theme from localStorage or system preference
      const stored = window.localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') theme = stored as 'light'|'dark';
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';

      const root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');

	     // react to OS theme changes when no explicit preference is stored
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
	       if (!window.localStorage.getItem('theme')) {
          theme = mq.matches ? 'dark' : 'light';
          if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
        }
      };
	     mq.addEventListener?.('change', onChange);
	     return () => mq.removeEventListener?.('change', onChange);
 		}
 	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-background">
    <Toaster richColors position="top-center" />
    {#if !isLoginPage}
    <div class="flex min-h-screen">
        <Sidebar />
        <div class="flex-1 pl-64">
            <main class="max-w-6xl mx-auto px-6 py-8">
                <div class="flex items-center justify-end pb-6">
                    <button class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors" type="button" onclick={() => { theme = theme === 'dark' ? 'light' : 'dark'; const root = document.documentElement; if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark'); window.localStorage.setItem('theme', theme); }}>
                        {#if theme === 'dark'}
                          <Sun class="size-4" />
                        {:else}
                          <Moon class="size-4" />
                        {/if}
                    </button>
                </div>
                {@render children?.()}
            </main>
        </div>
    </div>
    {:else}
        <main class="max-w-6xl mx-auto px-6 py-12">
            {@render children?.()}
        </main>
    {/if}
</div>
