<script lang="ts">
	import { page } from "$app/state";
	import { cn } from "$lib/utils/cn";
	import { t } from "$lib/i18n/index.svelte";
	import { session } from "$lib/state/session.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import {
		LayoutDashboard,
		Package,
		ShoppingCart,
		DollarSign,
		Users,
		Settings,
		Dribbble,
		Cake,
		ChevronLeft,
		ChevronRight,
		LogOut,
	} from "@lucide/svelte";

	type NavItem = {
		label: string;
		href: string;
		icon: typeof LayoutDashboard;
	};

	let collapsed = $state(false);

	const adminNav: NavItem[] = [
		{ label: "nav.dashboard", href: "/admin", icon: LayoutDashboard },
		{ label: "nav.products", href: "/admin/products", icon: Package },
		{ label: "nav.orders", href: "/admin/orders", icon: ShoppingCart },
		{ label: "nav.registers", href: "/admin/registers", icon: DollarSign },
		{ label: "nav.birthdays", href: "/admin/birthdays", icon: Cake },
		{ label: "nav.football", href: "/admin/football", icon: Dribbble },
		{ label: "nav.users", href: "/admin/users", icon: Users },
		{ label: "nav.settings", href: "/admin/settings", icon: Settings },
	];

	const secretaryNav: NavItem[] = [
		{ label: "nav.dashboard", href: "/secretary", icon: LayoutDashboard },
		{ label: "nav.appointments", href: "/secretary/birthdays", icon: Cake },
		{ label: "nav.football", href: "/secretary/football", icon: Dribbble },
	];

	const staffNav: NavItem[] = [
		{ label: "nav.dashboard", href: "/staff", icon: LayoutDashboard },
	];

	let navItems = $derived.by(() => {
		const role = session.user?.role;
		if (role === "admin") return adminNav;
		if (role === "secretary") return secretaryNav;
		return staffNav;
	});

	function isActive(href: string): boolean {
		if (href === "/admin" || href === "/secretary" || href === "/staff") {
			return page.url.pathname === href;
		}
		return page.url.pathname.startsWith(href);
	}
</script>

<aside
	class={cn(
		"fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-200",
		collapsed ? "w-16" : "w-64"
	)}
>
	<!-- Logo -->
	<div class="flex h-14 items-center border-b px-4">
		{#if !collapsed}
			<span class="text-lg font-bold text-foreground">clubOS</span>
		{:else}
			<span class="text-lg font-bold text-foreground">C</span>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
		{#each navItems as item (item.href)}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				class={cn(
					"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-sidebar-foreground hover:bg-sidebar-accent/50"
				)}
			>
				<item.icon class="h-5 w-5 shrink-0" />
				{#if !collapsed}
					<span>{t(item.label)}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<Separator />

	<!-- Footer -->
	<div class="p-2">
		<a
			href="/logout"
			class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
		>
			<LogOut class="h-5 w-5 shrink-0" />
			{#if !collapsed}
				<span>{t("nav.logout")}</span>
			{/if}
		</a>

		<!-- Collapse Toggle -->
		<Button
			variant="ghost"
			size="sm"
			class="mt-2 w-full justify-center"
			onclick={() => (collapsed = !collapsed)}
		>
			{#if collapsed}
				<ChevronRight class="h-4 w-4" />
			{:else}
				<ChevronLeft class="h-4 w-4" />
			{/if}
		</Button>
	</div>
</aside>

<!-- Spacer for main content -->
<div class={cn("shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-64")}></div>
