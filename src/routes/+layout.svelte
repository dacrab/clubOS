<script lang="ts">
import "../app.css";
import { MonitorCog, Moon, Sun } from "@lucide/svelte";
import type { ComponentType } from "svelte";
import { Toaster } from "svelte-sonner";
import { page } from "$app/stores";
import favicon from "$lib/assets/favicon.svg";
import { locale, t } from "$lib/i18n";
import { loadCurrentUser } from "$lib/user";

const { children } = $props();

type ThemeChoice = "light" | "dark" | "system";

let theme = $state<ThemeChoice>("system");
const isLoginPage = $derived($page.url.pathname === "/");
let SidebarComp = $state<ComponentType | null>(null);
let systemPrefersDark: MediaQueryList | null = null;

const shellClass = $derived(
	"min-h-screen bg-background text-foreground transition-colors duration-200",
);

const mainClass = $derived(
	isLoginPage
		? "flex flex-1 items-center justify-center px-4 pb-16 pt-8 sm:px-6"
		: "flex flex-1 flex-col px-6 pb-12 pt-6 md:px-10",
);

const contentWrapperClass = $derived(
	isLoginPage
		? "w-full max-w-md"
		: "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8",
);

function resolvedTheme(next: ThemeChoice): "light" | "dark" {
	if (typeof window === "undefined") {
		return next === "dark" ? "dark" : "light";
	}
	const prefersDark =
		systemPrefersDark?.matches ??
		window.matchMedia("(prefers-color-scheme: dark)").matches;
	return next === "system" ? (prefersDark ? "dark" : "light") : next;
}

function applyTheme(next: ThemeChoice) {
	if (typeof window === "undefined") {
		return;
	}
	theme = next;
	window.localStorage.setItem("theme", next);
	const root = document.documentElement;
	const resolved = resolvedTheme(next);
	if (resolved === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

function cycleTheme() {
	const order: ThemeChoice[] = ["light", "dark", "system"];
	const index = order.indexOf(theme);
	const nextIndex = index === -1 ? 0 : (index + 1) % order.length;
	const next = order[nextIndex] ?? "system";
	applyTheme(next);
}

type IconComponent = typeof Sun;

function themeIcon(): IconComponent {
	const current = resolvedTheme(theme);
	if (theme === "system") {
		return MonitorCog as IconComponent;
	}
	return (current === "dark" ? Moon : Sun) as IconComponent;
}

const ThemeIcon = $derived(themeIcon());

$effect(() => {
	if (typeof window === "undefined") {
		return;
	}
	if (!isLoginPage) {
		loadCurrentUser();
		(async () => {
			const mod = await import("$lib/components/sidebar.svelte");
			SidebarComp = mod.default;
		})();
	}
	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "system") {
		theme = stored;
	} else {
		theme = "system";
	}
	const mq = window.matchMedia("(prefers-color-scheme: dark)");
	systemPrefersDark = mq;
	applyTheme(theme);
	const onChange = (event: MediaQueryListEvent) => {
		if (theme === "system") {
			const root = document.documentElement;
			if (event.matches) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}
	};
	mq.addEventListener?.("change", onChange);
	return () => mq.removeEventListener?.("change", onChange);
});
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>clubOS</title>
</svelte:head>

<div class={shellClass}>
  <Toaster richColors position="top-center" />
  <div class="flex min-h-screen">
    {#if !isLoginPage}
      {#if SidebarComp}
        <SidebarComp themeIcon={ThemeIcon} on:toggleTheme={cycleTheme} />
      {/if}
    {/if}
    <div class="flex flex-1 flex-col">
      {#if isLoginPage}
        <div class="flex justify-end px-4 pt-6">
          <div
            class="flex items-center gap-2 rounded-full border border-outline-soft/70 bg-background/80 p-1"
          >
            <button
              type="button"
              class={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                $locale === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={$locale === "en"}
              onclick={() => {
                locale.set("en");
              }}
            >
              EN
            </button>
            <button
              type="button"
              class={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                $locale === "el"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={$locale === "el"}
              onclick={() => {
                locale.set("el");
              }}
            >
              EL
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-soft bg-background/90 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              onclick={cycleTheme}
              aria-label={t("common.toggleTheme")}
            >
              <ThemeIcon class="size-3.5" />
            </button>
          </div>
        </div>
      {/if}
      <main class={mainClass}>
        <div class={contentWrapperClass}>
          {@render children()}
        </div>
      </main>
    </div>
  </div>
</div>
