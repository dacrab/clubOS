<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { session } from "$lib/state/session.svelte";
	import DropdownMenu from "$lib/components/ui/dropdown-menu/dropdown-menu.svelte";
	import DropdownMenuTrigger from "$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte";
	import DropdownMenuContent from "$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte";
	import DropdownMenuItem from "$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte";
	import DropdownMenuSeparator from "$lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte";
	import DropdownMenuLabel from "$lib/components/ui/dropdown-menu/dropdown-menu-label.svelte";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import ThemeToggle from "$lib/components/layout/theme-toggle.svelte";
	import LanguageSwitcher from "$lib/components/layout/language-switcher.svelte";
	import { User, LogOut } from "@lucide/svelte";
	import { getRoleBadgeVariant, type MemberRole } from "$lib/types/database";

	type Props = { public?: boolean; showLogo?: boolean };
	let { public: isPublic = false, showLogo = true }: Props = $props();

	const roleLabel = $derived(session.user?.role ? t(`users.roles.${session.user.role}`) : "");
	const roleBadgeVariant = $derived(getRoleBadgeVariant(session.user?.role as MemberRole | undefined));
</script>

{#if isPublic}
	<header class="flex items-center justify-between border-b px-4 py-3">
		<a href="/" class="text-lg font-bold" class:invisible={!showLogo}>clubOS</a>
		<div class="flex items-center gap-2">
			<LanguageSwitcher />
			<ThemeToggle />
		</div>
	</header>
{:else}
	<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="flex items-center gap-4">
			{#if session.user}
				<Badge variant={roleBadgeVariant}>{roleLabel}</Badge>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<LanguageSwitcher showLabel />
			<ThemeToggle />
			{#if session.user}
				<DropdownMenu>
					<DropdownMenuTrigger><User class="h-4 w-4" /></DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{session.user.username || session.user.email}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<a href="/logout" class="flex items-center gap-2"><LogOut class="h-4 w-4" />{t("nav.logout")}</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			{/if}
		</div>
	</header>
{/if}
