<script lang="ts">
import { createEventDispatcher } from "svelte";
import { page } from "$app/state";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "$lib/components/ui/select";
import {
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Home,
	LogOut,
	Package,
	ReceiptText,
	Settings,
	UserCog,
} from "@lucide/svelte";
import type { TranslationKey } from "$lib/i18n/translations";
import { facilityState } from "$lib/state/facility.svelte";
import { i18nState, tt as t } from "$lib/state/i18n.svelte";
import { SIDEBAR_DIMENSIONS, sidebarState } from "$lib/state/sidebar.svelte";
import { type AppUser, userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";

type IconComponent = typeof Home;
const { themeIcon = null } = $props<{ themeIcon?: IconComponent | null }>();
const dispatch = createEventDispatcher<{ toggleTheme: undefined }>();

const userRole = $derived(
	(userState.current?.role ?? null) as AppUser["role"] | null,
);
const userName = $derived(
	userState.current?.username ?? userState.current?.email ?? "",
);
const userRoleLabel = $derived(
	userRole ? `${userRole[0]?.toUpperCase() ?? ""}${userRole.slice(1)}` : "",
);

type NavItem = {
	href: string;
	icon: typeof Home;
	labelKey: TranslationKey;
	roles?: Array<AppUser["role"] | null>;
};

type NavSection = {
	headingKey: TranslationKey;
	items: NavItem[];
};

const dashboardHref = $derived(
	userRole === "secretary"
		? "/secretary"
		: userRole === "staff"
			? "/staff"
			: "/admin",
);

const navSections: NavSection[] = $derived([
	{
		headingKey: "nav.overview",
		items: [{ href: dashboardHref, icon: Home, labelKey: "nav.dashboard" }],
	},
	{
		headingKey: "nav.admin",
		items: [
			{
				href: "/admin/products",
				icon: Package,
				labelKey: "nav.products",
				roles: ["admin"],
			},
			{
				href: "/admin/users",
				icon: UserCog,
				labelKey: "nav.users",
				roles: ["admin"],
			},
			{
				href: "/admin/orders",
				icon: ReceiptText,
				labelKey: "nav.orders",
				roles: ["admin"],
			},
			{
				href: "/admin/registers",
				icon: ClipboardList,
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
		headingKey: "nav.bookings",
		items: [
			{
				href: "/secretary/birthdays",
				icon: ClipboardList,
				labelKey: "appointments.title",
				roles: ["admin", "secretary"],
			},
			{
				href: "/secretary/football",
				icon: ClipboardList,
				labelKey: "nav.football",
				roles: ["admin", "secretary"],
			},
		],
	},
]);

const TRAILING_SLASH_RE = /\/+$/;
function normalizePath(p: string): string {
	const n = p.replace(TRAILING_SLASH_RE, "");
	return n === "" ? "/" : n;
}
const currentPath = $derived(normalizePath(page.url.pathname));
function isActive(path: string): boolean {
	const current = currentPath;
	const href = normalizePath(path);
	const depth = href.split("/").filter(Boolean).length;
	if (depth <= 1) return current === href;
	return current === href || current.startsWith(`${href}/`);
}

function hasAccess(item: NavItem): boolean {
	return !item.roles || item.roles.includes(userRole);
}
const visibleSections = $derived(
	navSections
		.map((section) => ({
			...section,
			items: section.items.filter(hasAccess),
		}))
		.filter((section) => section.items.length > 0),
);

async function logout(): Promise<void> {
	try {
		await fetch("/logout", { method: "POST" });
	} finally {
		window.location.href = "/";
	}
}
function toggleTheme() {
	dispatch("toggleTheme");
}
function setLocale(next: "en" | "el") {
	i18nState.locale = next;
}

// Collapse state and visibility gating
let collapsed = $state(false);
let showExpanded = $state(false);

$effect(() => {
	if (typeof window === "undefined") return;
	const saved = window.localStorage.getItem("sidebar-collapsed");
	collapsed = saved === "1";
	sidebarState.collapsed = collapsed;
	showExpanded = !collapsed;
});

$effect(() => {
	// sync from shared store
	collapsed = sidebarState.collapsed;
	if (collapsed) showExpanded = false;
});

async function toggleCollapsed() {
	collapsed = !collapsed;
	if (collapsed) showExpanded = false;
	sidebarState.animating = true;
	try {
		window.localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
	} catch {}
	sidebarState.collapsed = collapsed;

	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id;
	if (!uid) return;
	await supabase
		.from("user_preferences")
		.upsert(
			{ user_id: uid, collapsed_sidebar: collapsed },
			{ onConflict: "user_id" },
		);
}

function onSidebarTransitionEnd(event: TransitionEvent) {
	if (event.propertyName !== "width") return;
	if (!collapsed) {
		// Ensure layout is fully settled before revealing content
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				showExpanded = true;
				sidebarState.animating = false;
			});
		});
	} else {
		sidebarState.animating = false;
	}
}

const linkBase =
	"group flex items-center gap-3 h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const activeLink =
	"text-foreground bg-sidebar-accent/60 hover:bg-sidebar-accent";
const iconWrapper =
	"grid size-8 place-items-center rounded-lg border border-transparent bg-sidebar/40 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary";
const iconWrapperActive = "border-primary/40 bg-primary/10 text-primary";

// Orchestrated reveal flag (only after width finishes and not animating)
const reveal = $derived(showExpanded && !sidebarState.animating);

// Facility selection for admin
const facilities = $derived(facilityState.list);
let facilityId = $state<string | null>(null);
let initialFacilityId: string | null = null;

async function loadFacilitiesForUser(): Promise<void> {
	await facilityState.loadList();
	const selected = await facilityState.resolveSelected();
	facilityId = selected;
	initialFacilityId = selected;
}

$effect(() => {
	// Load facilities once user available
	if (userState.current) {
		loadFacilitiesForUser();
	}
});

$effect(() => {
	if (!initialFacilityId) return;
	if (facilityId && facilityId !== initialFacilityId) {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem("selected-facility", facilityId);
				window.location.reload();
			}
		} catch {}
	}
});
</script>

<aside
    class="fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border/70 bg-sidebar/80 backdrop-blur transition-[width] duration-200 ease-in-out overflow-hidden"
    style={`width: ${collapsed ? SIDEBAR_DIMENSIONS.collapsed : SIDEBAR_DIMENSIONS.expanded}; will-change: width; contain: layout paint; backface-visibility: hidden;`}
    ontransitionend={onSidebarTransitionEnd}
>
    <!-- Brand -->
    <div class="flex flex-col gap-6 px-4 pb-6 pt-10">
        <div class="flex items-center gap-3">
            <span
                class="grid size-9 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary"
                >CO</span
            >
            {#if reveal}
                <div
                    class="flex flex-col leading-tight transition-all duration-200 ease-out opacity-100 translate-x-0"
                    style="will-change: opacity, transform; transition-delay: 60ms;"
                >
                    <span
                        class="text-xs font-semibold uppercase text-muted-foreground"
                        >clubOS</span
                    >
                    <span class="text-sm text-muted-foreground/80"
                        >{t("common.operatingSuite")}</span
                    >
                </div>
            {/if}
        </div>
        {#if reveal}
            <p
                class="text-[13px] leading-6 text-muted-foreground transition-all duration-200 ease-out opacity-100 translate-x-0"
                style="will-change: opacity, transform; transition-delay: 100ms;"
            >
                {t("common.tagline")}
            </p>
        {/if}
    </div>

    <!-- Navigation -->
    {#if userRole !== "staff"}
        <nav class="flex-1 overflow-y-auto px-2 pb-8 scrollbar-thin">
            <div class="flex flex-col gap-7">
                {#each visibleSections as section}
                    <div class="flex flex-col gap-2">
                        {#if section.headingKey && reveal}
                            <span
                                class="text-[11px] font-semibold uppercase text-muted-foreground transition-all duration-200 ease-out opacity-100 translate-x-0"
                                style="will-change: opacity, transform; transition-delay: 120ms;"
                            >
                                {t(section.headingKey)}
                            </span>
                        {/if}
                        <div class="flex flex-col gap-1.5">
                            {#each section.items as item}
                                {@const active = isActive(item.href)}
                                <a
                                    href={item.href}
                                    class={`${linkBase} ${active ? activeLink : ""}`}
                                    aria-current={active ? "page" : undefined}
                                    title={collapsed ? t(item.labelKey) : undefined}
                                >
                                    <span
                                        class={`${iconWrapper} ${active ? iconWrapperActive : ""}`}
                                    >
                                        <item.icon class="size-4" />
                                    </span>
                                    {#if reveal}
                                        <span
                                            class="truncate transition-all duration-200 ease-out opacity-100 translate-x-0"
                                            style="will-change: opacity, transform; transition-delay: 140ms;"
                                        >
                                            {t(item.labelKey)}
                                        </span>
                                    {/if}
                                </a>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </nav>
    {/if}

    <!-- Collapse Toggle & Quick Settings & User -->
    <div class="border-t border-sidebar-border/70 px-4 py-6">
        <div class="flex flex-col gap-4">
            <!-- Toggle row -->
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-soft/60 text-muted-foreground hover:text-foreground"
                    onclick={toggleCollapsed}
                    aria-label={t("common.toggleSidebar")}
                    title={collapsed
                        ? t("common.toggleSidebar")
                        : t("common.collapse")}
                >
                    {#if collapsed}
                        <ChevronRight class="size-4" />
                    {:else}
                        <ChevronLeft class="size-4" />
                    {/if}
                </button>
                {#if reveal}
                    <span
                        class="text-sm font-medium text-muted-foreground transition-all duration-200 ease-out opacity-100 translate-x-0"
                        style="will-change: opacity, transform; transition-delay: 160ms;"
                    >
                        {t("common.collapse")}
                    </span>
                {/if}
            </div>

            <!-- Quick Settings -->
            <div
                class={`rounded-xl border border-outline-soft/60 bg-sidebar-muted/30 px-2 py-2 overflow-hidden ${collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between gap-3"}`}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger
                        class={`${collapsed ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-soft/50 bg-background/80 text-[11px] font-semibold text-muted-foreground outline-hidden transition-colors hover:border-primary/30 hover:text-primary" : "inline-flex h-8 items-center justify-center rounded-full border border-outline-soft/50 bg-background/80 px-3 text-[11px] font-medium text-muted-foreground outline-hidden transition-colors hover:border-primary/30 hover:text-primary"}`}
                        aria-label={t("common.changeLanguage")}
                        title={collapsed
                            ? t("common.changeLanguage")
                            : undefined}
                    >
                        {(i18nState.locale || "en").toUpperCase()}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align={collapsed ? "center" : "start"}
                        class="w-40"
                    >
                        <DropdownMenuItem onclick={() => setLocale("en")}
                            >EN — English</DropdownMenuItem
                        >
                        <DropdownMenuItem onclick={() => setLocale("el")}
                            >EL — Ελληνικά</DropdownMenuItem
                        >
                    </DropdownMenuContent>
                </DropdownMenu>
                {#if reveal}
                    <span
                        class="flex-1 text-center text-[11px] font-medium text-muted-foreground transition-all duration-200 ease-out opacity-100 translate-x-0"
                        style="will-change: opacity, transform; transition-delay: 180ms;"
                    >
                        {t("common.quickSettings")}
                    </span>
                {/if}
                <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-soft/60 bg-background/90 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    onclick={toggleTheme}
                    aria-label={t("common.toggleTheme")}
                    title={collapsed ? t("common.toggleTheme") : undefined}
                >
                    {#if themeIcon}
                        {@const ThemeGlyph = themeIcon}
                        <ThemeGlyph class="size-4" />
                    {:else}
                        <span class="size-2 rounded-full bg-current"></span>
                    {/if}
                </button>
            </div>

            {#if userRole === "admin" && facilities.length > 1}
                <div class="rounded-xl border border-outline-soft/60 bg-sidebar-muted/30 px-3 py-2">
                    <div class="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">{t("common.facility")}</div>
                    <Select bind:value={facilityId}>
                        <SelectTrigger class="w-full justify-between">
                            <span data-slot="select-value">
                                {#if facilityId}
                                    {facilities.find((f) => f.id === facilityId)?.name ?? t("common.facility")}
                                {:else}
                                    {t("common.facility")}
                                {/if}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {#each facilities as f}
                                <SelectItem value={f.id}>{f.name}</SelectItem>
                            {/each}
                        </SelectContent>
                    </Select>
                </div>
            {/if}

            <!-- User -->
            {#if userState.current && reveal}
                <div
                    class="rounded-xl border border-sidebar-border/60 bg-sidebar-muted/40 px-4 py-3 transition-all duration-200 ease-out opacity-100 translate-x-0"
                    style="will-change: opacity, transform; transition-delay: 200ms;"
                >
                    <p class="text-sm font-semibold text-foreground">
                        {userName || t("login.title")}
                    </p>
                    {#if userRoleLabel !== ""}
                        <p class="text-xs text-muted-foreground">
                            {userRoleLabel}
                        </p>
                    {/if}
                </div>
            {/if}

            <!-- Logout -->
            <button
                type="button"
                class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-soft/50 bg-background/90 text-sm font-medium text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                onclick={logout}
            >
                <LogOut class="size-4" />
                {#if reveal}
                    <span
                        class="transition-all duration-200 ease-out opacity-100 translate-x-0"
                        style="will-change: opacity, transform; transition-delay: 220ms;"
                    >
                        {t("nav.logout")}
                    </span>
                {/if}
            </button>
        </div>
    </div>
</aside>
