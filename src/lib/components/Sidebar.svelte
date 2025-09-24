<script lang="ts">
import {
  ClipboardList,
  Home,
  LogOut,
  Moon,
  Package,
  ReceiptText,
  Sun,
  UserCog,
} from "@lucide/svelte";
import { page } from "$app/stores";
import type { TranslationKey } from "$lib/i18n";
import { locale, t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { type AppUser, currentUser } from "$lib/user";

let theme = $state<"light" | "dark">("dark");

$effect(() => {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark")
    theme = stored as "light" | "dark";
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
});

function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.localStorage.setItem("theme", theme);
}

const userRole = $derived(
  ($currentUser?.role ?? null) as AppUser["role"] | null
);

type NavItem = {
  href: string;
  icon: typeof Home;
  labelKey: TranslationKey;
  roles?: Array<AppUser["role"] | null>;
};

type NavSection = {
  headingKey?: TranslationKey;
  heading?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    headingKey: "nav.overview" as TranslationKey,
    items: [
      {
        href: "/dashboard",
        icon: Home,
        labelKey: "nav.dashboard",
      },
    ],
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

function isActive(path: string): boolean {
  return $page.url.pathname.startsWith(path);
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = "/";
}

function hasAccess(item: NavItem): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(userRole);
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
  "group flex items-center gap-2 h-9 rounded-full px-3 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground";
const activeLink =
  "text-foreground bg-sidebar-accent/60 hover:text-foreground hover:bg-sidebar-accent";
const iconWrapper =
  "grid size-7 place-items-center rounded-full border border-sidebar-border bg-sidebar/40 text-muted-foreground transition-colors group-hover:border-transparent group-hover:bg-primary/10 group-hover:text-primary";
const iconWrapperActive = "border-transparent bg-primary/10 text-primary";
</script>

<aside class="fixed left-0 top-0 z-30 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
  <div class="flex-1 overflow-y-auto scrollbar-thin">
    <div class="flex flex-col gap-10 px-8 py-12">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="grid size-9 place-items-center rounded-3xl bg-primary/10 text-sm font-semibold text-primary">
            CO
          </div>
          <div class="flex flex-col leading-tight">
            <span class="eyebrow tracking-[0.3em] text-xs">clubOS</span>
            <span class="text-xl font-semibold">{t("common.operatingSuite")}</span>
          </div>
        </div>
        <p class="text-xs leading-relaxed text-muted-foreground">
          {t("common.tagline")}
        </p>
      </div>

      <nav class="flex flex-col gap-8">
        {#each visibleSections as section}
          <div class="flex flex-col gap-3">
            {#if section.heading || section.headingKey}
              <span class="eyebrow">
                {section.headingKey ? t(section.headingKey) : section.heading}
              </span>
            {/if}
            <div class="flex flex-col gap-1.5">
              {#each section.items as item}
                {@const active = isActive(item.href)}
                <a
                  href={item.href}
                  class={`${linkBase} ${active ? activeLink : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span class={`${iconWrapper} ${active ? iconWrapperActive : ""}`}>
                    <item.icon class="size-3.5" />
                  </span>
                  {t(item.labelKey)}
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </nav>
    </div>
  </div>

  <div class="border-t border-sidebar-border/80 px-8 py-7">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded-full border border-sidebar-border/80 bg-sidebar/50 p-1.5">
        <button
          type="button"
          class={`${
            $locale === "en"
              ? "rounded-full bg-sidebar-primary px-3 py-1 text-xs font-semibold text-sidebar-primary-foreground"
              : "rounded-full px-3 py-1 text-xs text-muted-foreground"
          } transition-colors`}
          aria-pressed={$locale === "en"}
          onclick={() => {
            locale.set("en");
          }}
        >
          EN
        </button>
        <button
          type="button"
          class={`${
            $locale === "el"
              ? "rounded-full bg-sidebar-primary px-3 py-1 text-xs font-semibold text-sidebar-primary-foreground"
              : "rounded-full px-3 py-1 text-xs text-muted-foreground"
          } transition-colors`}
          aria-pressed={$locale === "el"}
          onclick={() => {
            locale.set("el");
          }}
        >
          EL
        </button>
        <button
          type="button"
          class="justify-self-end inline-flex h-9 w-9 items-center justify-center rounded-full border border-sidebar-border/80 text-muted-foreground transition-colors hover:border-transparent hover:bg-primary/10 hover:text-primary"
          onclick={toggleTheme}
          aria-label={t("common.toggleTheme")}
        >
          {#if theme === "dark"}
            <Sun class="size-3.5" />
          {:else}
            <Moon class="size-3.5" />
          {/if}
        </button>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-destructive text-sm font-medium text-white transition-colors hover:bg-destructive/90"
        onclick={logout}
      >
        <LogOut class="size-4" />
        {t("nav.logout")}
      </button>
    </div>
  </div>
</aside>
