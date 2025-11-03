<script lang="ts">
import "../app.css";
import { MonitorCog, Moon, Sun } from "@lucide/svelte";
import type { ComponentType } from "svelte";
import { Toaster } from "svelte-sonner";
import { page } from "$app/state";
import favicon from "$lib/assets/favicon.svg";
import { locale, t } from "$lib/i18n";
import { sidebarCollapsed } from "$lib/sidebar";
import { loadCurrentUser } from "$lib/user";

const { children } = $props();

type ThemeChoice = "light" | "dark" | "system";

let theme = $state<ThemeChoice>("system");
const isLoginPage = $derived(page.url.pathname === "/");
const isErrorPage = $derived(
	typeof page.status === "number" && page.status >= 400,
);
let SidebarComp = $state<ComponentType | null>(null);
let systemPrefersDark: MediaQueryList | null = null;

const shellClass =
	"min-h-screen bg-background text-foreground transition-colors duration-200";

// derive on current path
const mainClass = $derived(
	page.url.pathname === "/"
		? "flex flex-1 items-center justify-center px-4 pb-16 pt-8 sm:px-6"
		: "flex flex-1 flex-col px-6 pb-12 pt-6 md:px-10",
);

const contentWrapperClass = $derived(
	page.url.pathname === "/"
		? "w-full max-w-md"
		: "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8",
);

const sidebarWidth = $derived($sidebarCollapsed ? "4rem" : "16rem");
const layoutPaddingStyle = $derived(
	page.url.pathname === "/"
		? ""
		: isErrorPage
			? ""
			: `padding-left: ${sidebarWidth}; will-change: padding-left;`,
);

function resolvedTheme(choice: ThemeChoice): "light" | "dark" {
	if (typeof window === "undefined")
		return choice === "dark" ? "dark" : "light";
	const prefersDark =
		systemPrefersDark?.matches ??
		window.matchMedia("(prefers-color-scheme: dark)").matches;
	return choice === "system" ? (prefersDark ? "dark" : "light") : choice;
}

function applyTheme(choice: ThemeChoice) {
	if (typeof window === "undefined") return;
	theme = choice;
	window.localStorage.setItem("theme", choice);
	const root = document.documentElement;
	const resolved = resolvedTheme(choice);
	root.classList.toggle("dark", resolved === "dark");
}

function cycleTheme() {
	const order: ThemeChoice[] = ["light", "dark", "system"];
	const index = order.indexOf(theme);
	const nextIndex = index === -1 ? 0 : (index + 1) % order.length;
	const next = order[nextIndex] ?? "system";
	applyTheme(next);
}

function themeIcon() {
	if (theme === "system") return MonitorCog;
	return resolvedTheme(theme) === "dark" ? Moon : Sun;
}

const ThemeIcon = $derived(themeIcon());

$effect(() => {
	if (typeof window === "undefined") return;

	if (!isLoginPage) {
		loadCurrentUser();
		import("$lib/components/sidebar.svelte").then((mod) => {
			SidebarComp = mod.default;
		});
	}

	const savedSidebar = window.localStorage.getItem("sidebar-collapsed");
	sidebarCollapsed.set(savedSidebar === "1");

	const stored = window.localStorage.getItem("theme");
	theme =
		stored === "light" || stored === "dark" || stored === "system"
			? stored
			: "system";

	const mq = window.matchMedia("(prefers-color-scheme: dark)");
	systemPrefersDark = mq;
	applyTheme(theme);

	const onChange = (event: MediaQueryListEvent) => {
		if (theme === "system") {
			document.documentElement.classList.toggle("dark", event.matches);
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
	<div
		class="flex min-h-screen transition-[padding-left] duration-200 ease-in-out"
		style={layoutPaddingStyle}
	>
		{#if !isLoginPage && !isErrorPage && SidebarComp}
			<SidebarComp themeIcon={ThemeIcon} on:toggleTheme={cycleTheme} />
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
							onclick={() => locale.set("en")}
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
							onclick={() => locale.set("el")}
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
				<div class={contentWrapperClass}>{@render children()}</div>
			</main>
		</div>
	</div>
</div>
