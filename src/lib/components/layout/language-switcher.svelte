<script lang="ts">
	import { i18n, t } from "$lib/i18n/index.svelte";
	import DropdownMenu from "$lib/components/ui/dropdown-menu/dropdown-menu.svelte";
	import DropdownMenuTrigger from "$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte";
	import DropdownMenuContent from "$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte";
	import DropdownMenuItem from "$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte";
	import DropdownMenuSeparator from "$lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte";
	import DropdownMenuLabel from "$lib/components/ui/dropdown-menu/dropdown-menu-label.svelte";
	import { Globe } from "@lucide/svelte";

	type Props = { showLabel?: boolean };
	let { showLabel = false }: Props = $props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		<Globe class="h-4 w-4" />
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		{#if showLabel}
			<DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
			<DropdownMenuSeparator />
		{/if}
		<DropdownMenuItem onSelect={() => i18n.setLocale("en")}>{t("settings.languages.en")}</DropdownMenuItem>
		<DropdownMenuItem onSelect={() => i18n.setLocale("el")}>{t("settings.languages.el")}</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
