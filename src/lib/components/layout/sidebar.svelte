<script lang="ts">
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	LayoutDashboard,
	Package,
	Settings,
	ShoppingCart,
	Trophy,
	Users,
} from "@lucide/svelte";
import { page } from "$app/state";
import type { TranslationKey } from "$lib/i18n/translations";
import { t } from "$lib/state/i18n.svelte";
import { SIDEBAR_DIMENSIONS, sidebarState } from "$lib/state/sidebar.svelte";
import { type AppUser, userState } from "$lib/state/user.svelte";
import { cn } from "$lib/utils/utils";

const userRole = $derived((userState.current?.role ?? null) as AppUser["role"] | null);

type NavItem = {
	href: string;
	icon: typeof LayoutDashboard;
	labelKey: TranslationKey;
	roles?: AppUser["role"][];
};

const dashboardHref = $derived(
	userRole === "secretary" ? "/secretary" : userRole === "staff" ? "/staff" : "/admin",
);

const navItems = $derived<{ section?: TranslationKey; items: NavItem[] }[]>([
	{
		items: [{ href: dashboardHref, icon: LayoutDashboard, labelKey: "nav.dashboard" }],
	},
	{
		section: "nav.admin",
		items: [
			{
				href: "/admin/products",
				icon: Package,
				labelKey: "nav.products",
				roles: ["admin"],
			},
			{
				href: "/admin/users",
				icon: Users,
				labelKey: "nav.users",
				roles: ["admin"],
			},
			{
				href: "/admin/orders",
				icon: ShoppingCart,
				labelKey: "nav.orders",
				roles: ["admin"],
			},
			{
				href: "/admin/registers",
				icon: ShoppingCart,
				labelKey: "nav.registers",
				roles: ["admin"],
			},
			{
				href: "/admin/settings",
				icon: Settings,
				labelKey: "nav.settings",
				roles: ["admin"],
			},
		],
	},
	{
		section: "nav.bookings",
		items: [
			{
				href: "/secretary/birthdays",
				icon: Calendar,
				labelKey: "appointments.title",
				roles: ["admin", "secretary"],
			},
			{
				href: "/secretary/football",
				icon: Trophy,
				labelKey: "nav.football",
				roles: ["admin", "secretary"],
			},
		],
	},
]);

function isActive(href: string) {
	return page.url.pathname.startsWith(href);
}

function hasAccess(item: NavItem) {
	return !item.roles || (userRole && item.roles.includes(userRole));
}

function toggle() {
	sidebarState.collapsed = !sidebarState.collapsed;
	localStorage.setItem("sidebar-collapsed", sidebarState.collapsed ? "1" : "0");
}
</script>

<aside
	class="fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 ease-in-out"
	style="width: {sidebarState.collapsed ? SIDEBAR_DIMENSIONS.collapsed : SIDEBAR_DIMENSIONS.expanded}"
>
	<div class="flex h-full flex-col">
		<!-- Brand -->
		<div class="flex h-16 items-center px-4 border-b border-border/40">
			<div class={cn("flex items-center overflow-hidden", !sidebarState.collapsed && "gap-3")}>
				<div class="grid size-8 min-w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
					CO
				</div>
				<span class={cn("font-semibold truncate transition-opacity duration-200", sidebarState.collapsed ? "opacity-0 w-0" : "opacity-100")}>
					clubOS
				</span>
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin">
			{#each navItems as group}
				{@const visibleItems = group.items.filter(hasAccess)}
				{#if visibleItems.length > 0}
					<div class="space-y-1">
						{#if group.section && !sidebarState.collapsed}
							<div class="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 animate-in fade-in duration-200">
								{t(group.section)}
							</div>
						{/if}
						{#each visibleItems as item}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								class={cn(
									"flex items-center px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
									!sidebarState.collapsed && "gap-3",
									active 
										? "bg-primary/10 text-primary" 
										: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
									sidebarState.collapsed && "justify-center px-2"
								)}
								title={sidebarState.collapsed ? t(item.labelKey) : undefined}
							>
								<item.icon class="size-5 shrink-0" />
								<span class={cn("truncate transition-all duration-200", sidebarState.collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
									{t(item.labelKey)}
								</span>
							</a>
						{/each}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Toggle -->
		<div class="p-4 border-t border-border/40">
			<button
				onclick={toggle}
				class="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
			>
				{#if sidebarState.collapsed}
					<ChevronRight class="size-5 mx-auto" />
				{:else}
					<ChevronLeft class="size-5" />
					<span>{t("common.collapse")}</span>
				{/if}
			</button>
		</div>
	</div>
</aside>
