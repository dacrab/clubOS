<script lang="ts">
	import { i18n } from "$lib/i18n/index.svelte";
	import { theme } from "$lib/state/theme.svelte";
	import { Button } from "$lib/components/ui/button";
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "$lib/components/ui/dropdown-menu";
	import { Sun, Moon, Globe } from "@lucide/svelte";

	type Props = { showLogo?: boolean };
	let { showLogo = true }: Props = $props();
</script>

<header class="flex items-center justify-between border-b px-4 py-3">
	{#if showLogo}
		<a href="/" class="text-lg font-bold">clubOS</a>
	{:else}
		<span></span>
	{/if}
	<div class="flex items-center gap-2">
		<DropdownMenu>
			<DropdownMenuTrigger><Globe class="h-4 w-4" /></DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => i18n.setLocale("en")}>English</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => i18n.setLocale("el")}>Ελληνικά</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
		<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>
			{#if theme.isDark}<Sun class="h-4 w-4" />{:else}<Moon class="h-4 w-4" />{/if}
		</Button>
	</div>
</header>
