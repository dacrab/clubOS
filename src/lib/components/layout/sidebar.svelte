<script lang="ts">
	import { page } from "$app/state";
	import { cn } from "$lib/utils/cn";
	import { t } from "$lib/i18n/index.svelte";
	import { session } from "$lib/state/session.svelte";
	import { Button } from "$lib/components/ui/button";
	import Separator from "$lib/components/ui/separator/separator.svelte";
	import { LayoutDashboard, Package, ShoppingCart, DollarSign, Users, Settings, Dribbble, Cake, ChevronLeft, ChevronRight, LogOut } from "@lucide/svelte";
	import type { MemberRole } from "$lib/types/database";

	type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

	let collapsed = $state(false);

	const adminNav: NavItem[] = [
		{ label: "nav.dashboard", href: "/admin", icon: LayoutDashboard },
		{ label: "nav.products", href: "/admin/products", icon: Package },
		{ label: "nav.orders", href: "/admin/orders", icon: ShoppingCart },
		{ label: "nav.registers", href: "/admin/registers", icon: DollarSign },
		{ label: "nav.birthdays", href: "/bookings/birthday", icon: Cake },
		{ label: "nav.football", href: "/bookings/football", icon: Dribbble },
		{ label: "nav.users", href: "/admin/users", icon: Users },
		{ label: "nav.settings", href: "/admin/settings", icon: Settings },
	];

	const navConfig: Record<MemberRole, NavItem[]> = {
		owner: adminNav,
		admin: adminNav,
		manager: [
			{ label: "nav.dashboard", href: "/secretary", icon: LayoutDashboard },
			{ label: "nav.birthdays", href: "/bookings/birthday", icon: Cake },
			{ label: "nav.football", href: "/bookings/football", icon: Dribbble },
		],
		staff: [
			{ label: "nav.dashboard", href: "/staff", icon: LayoutDashboard },
		],
	};

	const navItems = $derived(navConfig[session.user?.role ?? "staff"] ?? navConfig.staff);
	const isActive = (href: string) => href === "/admin" || href === "/secretary" || href === "/staff" ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<aside class={cn("fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-200", collapsed ? "w-16" : "w-64")}>
	<div class="flex h-14 items-center border-b px-4">
		{#if collapsed}
			<img src="/favicon.svg" alt="clubOS" class="h-8 w-8" />
		{:else}
			<img src="/favicon.svg" alt="clubOS" class="mr-2 h-7 w-7" />
			<span class="text-lg font-bold text-foreground">clubOS</span>
		{/if}
	</div>
	<nav class="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
		{#each navItems as item (item.href)}
			<a href={item.href} class={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive(item.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
				<item.icon class="h-5 w-5 shrink-0" />{#if !collapsed}<span>{t(item.label)}</span>{/if}
			</a>
		{/each}
	</nav>
	<Separator />
	<div class="p-2">
		<a href="/logout" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50">
			<LogOut class="h-5 w-5 shrink-0" />{#if !collapsed}<span>{t("nav.logout")}</span>{/if}
		</a>
		<Button variant="ghost" size="sm" class="mt-2 w-full justify-center" onclick={() => collapsed = !collapsed}>
			{#if collapsed}<ChevronRight class="h-4 w-4" />{:else}<ChevronLeft class="h-4 w-4" />{/if}
		</Button>
	</div>
</aside>
<div class={cn("shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-64")}></div>
