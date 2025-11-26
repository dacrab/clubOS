<script lang="ts">
	import { i18n, t } from "$lib/i18n/index.svelte";
	import { session } from "$lib/state/session.svelte";
	import { theme } from "$lib/state/theme.svelte";
	import { Button } from "$lib/components/ui/button";
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "$lib/components/ui/dropdown-menu";
	import { Badge } from "$lib/components/ui/badge";
	import { Sun, Moon, Globe, User, LogOut } from "@lucide/svelte";

	const roleLabel = $derived(session.user?.role ? t(`users.roles.${session.user.role}`) : "");
	const roleBadge = $derived(session.user?.role === "admin" ? "default" as const : session.user?.role === "secretary" ? "secondary" as const : "outline" as const);
</script>

<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="flex items-center gap-4">{#if session.user}<Badge variant={roleBadge}>{roleLabel}</Badge>{/if}</div>
	<div class="flex items-center gap-2">
		<DropdownMenu>
			<DropdownMenuTrigger><Button variant="ghost" size="icon"><Globe class="h-4 w-4" /></Button></DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => i18n.setLocale("en")}>{t("settings.languages.en")}</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => i18n.setLocale("el")}>{t("settings.languages.el")}</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
		<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>{#if theme.isDark}<Sun class="h-4 w-4" />{:else}<Moon class="h-4 w-4" />{/if}</Button>
		{#if session.user}
			<DropdownMenu>
				<DropdownMenuTrigger><Button variant="ghost" size="icon"><User class="h-4 w-4" /></Button></DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{session.user.username || session.user.email}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem><a href="/logout" class="flex items-center gap-2"><LogOut class="h-4 w-4" />{t("nav.logout")}</a></DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		{/if}
	</div>
</header>
