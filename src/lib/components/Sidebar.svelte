<script lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Package,
  ReceiptText,
  UserCog,
} from "@lucide/svelte";
import { createEventDispatcher } from "svelte";
import { page } from "$app/stores";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import type { TranslationKey } from "$lib/i18n";
import { locale, t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { type AppUser, currentUser } from "$lib/user";

type IconComponent = typeof Home;

const { themeIcon = null } = $props<{ themeIcon?: IconComponent | null }>();

const dispatch = createEventDispatcher<{ toggleTheme: undefined }>();

const userRole = $derived(
  ($currentUser?.role ?? null) as AppUser["role"] | null
);
const userName = $derived($currentUser?.username ?? $currentUser?.email ?? "");
const userRoleLabel = $derived(
  userRole ? `${userRole[0]?.toUpperCase() ?? ""}${userRole.slice(1)}` : ""
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

const navSections: NavSection[] = [
  {
    headingKey: "nav.overview",
    items: [{ href: "/admin", icon: Home, labelKey: "nav.dashboard" }],
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
    ],
  },
  {
    headingKey: "nav.bookings",
    items: [
      {
        href: "/secretary/birthdays",
        icon: ClipboardList,
        labelKey: "pages.appointments.title",
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
];

const TRAILING_SLASH_RE = /\/+$/;

function normalizePath(p: string): string {
  const n = p.replace(TRAILING_SLASH_RE, "");
  return n === "" ? "/" : n;
}

const currentPath = $derived(normalizePath($page.url.pathname));

function isActive(path: string): boolean {
  const current = currentPath;
  const href = normalizePath(path);
  const depth = href.split("/").filter(Boolean).length; // e.g. "/admin" -> 1, "/admin/products" -> 2
  if (depth <= 1) {
    return current === href;
  }
  return current === href || current.startsWith(`${href}/`);
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = "/";
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
    .filter((section) => section.items.length > 0)
);

const linkBase =
  "group flex items-center gap-3 h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const activeLink =
  "text-foreground bg-sidebar-accent/60 hover:bg-sidebar-accent";
const iconWrapper =
  "grid size-8 place-items-center rounded-lg border border-transparent bg-sidebar/40 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary";
const iconWrapperActive = "border-primary/40 bg-primary/10 text-primary";

function toggleTheme() {
  dispatch("toggleTheme");
}

function setLocale(next: "en" | "el") {
  locale.set(next);
}
let collapsed = $state(false);

$effect(() => {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("sidebar-collapsed");
  collapsed = saved === "1";
});

async function toggleCollapsed() {
  collapsed = !collapsed;
  try {
    window.localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  } catch (/** ignore storage quota or privacy mode */ _err) {
    /* no-op */
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return;
  await supabase
    .from("user_preferences")
    .upsert(
      { user_id: uid, collapsed_sidebar: collapsed },
      { onConflict: "user_id" }
    );
}
</script>

<aside
  class={`fixed left-0 top-0 z-30 flex h-full ${collapsed ? "w-16" : "w-64"} flex-col border-r border-sidebar-border/70 bg-sidebar/80 backdrop-blur transition-[width] duration-200`}
>
  <div class="flex flex-1 flex-col">
    <div class="flex flex-col gap-6 px-4 pb-6 pt-10">
      <div class="flex items-center gap-3">
        <span
          class="grid size-9 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary"
        >
          CO
        </span>
        <div
          class="flex flex-col leading-tight"
          style={`display:${collapsed ? "none" : "flex"}`}
        >
          <span
            class="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground"
          >
            clubOS
          </span>
          <span class="text-sm text-muted-foreground/80">
            {t("common.operatingSuite")}
          </span>
        </div>
      </div>
      <p
        class="text-[13px] leading-6 text-muted-foreground"
        style={`display:${collapsed ? "none" : "block"}`}
      >
        {t("common.tagline")}
      </p>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-8 scrollbar-thin">
      <div class="flex flex-col gap-7">
        {#each visibleSections as section}
          <div class="flex flex-col gap-2">
            {#if section.headingKey && !collapsed}
              <span
                class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
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
                  {#if !collapsed}
                    <span class="truncate">{t(item.labelKey)}</span>
                  {/if}
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </nav>
  </div>

  <!-- Collapse toggle moved near the bottom, above the divider and controls -->
  <div class="px-4 pb-4 flex items-center gap-2">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-soft/60 text-muted-foreground hover:text-foreground"
      onclick={toggleCollapsed}
      aria-label={t("common.toggleSidebar")}
      title={collapsed ? t("common.toggleSidebar") : t("common.collapse")}
    >
      {#if collapsed}
        <ChevronRight class="size-4" />
      {:else}
        <ChevronLeft class="size-4" />
      {/if}
    </button>
    {#if !collapsed}
      <span class="text-sm font-medium text-muted-foreground">
        {t("common.collapse")}
      </span>
    {/if}
  </div>

  <div class="border-t border-sidebar-border/70 px-4 py-6">
    <div class="flex flex-col gap-4">
      <div
        class={`rounded-xl border border-outline-soft/60 bg-sidebar-muted/30 px-2 py-2 overflow-hidden ${
          collapsed
            ? "flex flex-col items-center gap-2"
            : "flex items-center justify-between gap-3"
        }`}
      >
        <!-- Compact language selector showing current locale; opens a dropdown to change -->
        <DropdownMenu>
          <DropdownMenuTrigger
            class={`${
              collapsed
                ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-soft/50 bg-background/80 text-[11px] font-semibold text-muted-foreground outline-hidden transition-colors hover:border-primary/30 hover:text-primary"
                : "inline-flex h-8 items-center justify-center rounded-full border border-outline-soft/50 bg-background/80 px-3 text-[11px] font-medium text-muted-foreground outline-hidden transition-colors hover:border-primary/30 hover:text-primary"
            }`}
            aria-label={t("common.changeLanguage")}
            title={collapsed ? t("common.changeLanguage") : undefined}
          >
            {($locale || "en").toUpperCase()}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={collapsed ? "center" : "start"}
            class="w-40"
          >
            <DropdownMenuItem onclick={() => setLocale("en")}>
              EN — English
            </DropdownMenuItem>
            <DropdownMenuItem onclick={() => setLocale("el")}>
              EL — Ελληνικά
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {#if !collapsed}
          <span
            class="flex-1 text-center text-[11px] font-medium text-muted-foreground"
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
      {#if $currentUser && !collapsed}
        <div
          class="rounded-xl border border-sidebar-border/60 bg-sidebar-muted/40 px-4 py-3"
        >
          <p class="text-sm font-semibold text-foreground">
            {userName || t("login.title")}
          </p>
          {#if userRoleLabel !== ""}
            <p class="text-xs text-muted-foreground">{userRoleLabel}</p>
          {/if}
        </div>
      {/if}
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-soft/50 bg-background/90 text-sm font-medium text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        onclick={logout}
      >
        <LogOut class="size-4" />
        {#if !collapsed}{t("nav.logout")}
        {/if}
      </button>
    </div>
  </div>
</aside>
