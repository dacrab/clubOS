<script lang="ts">
import "../app.css";
import { Toaster } from "svelte-sonner";
import { page } from "$app/stores";
import favicon from "$lib/assets/favicon.svg";
import { loadCurrentUser } from "$lib/user";

const { children } = $props();

let theme = $state<"light" | "dark" | "system">("system");
const isLoginPage = $derived($page.url.pathname === "/");
let SidebarComp = $state<any>(null);

const shellClass = $derived(
  "min-h-screen bg-background text-foreground transition-colors duration-200"
);

$effect(() => {
  if (typeof window !== "undefined") {
    if (!isLoginPage) {
      loadCurrentUser();
      (async () => {
        const mod = await import("$lib/components/Sidebar.svelte");
        SidebarComp = mod.default;
      })();
    }
    // initialize theme from localStorage or system preference
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      theme = stored as "light" | "dark" | "system";
    } else {
      theme = "system";
    }

    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      if (resolved === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    };
    applyTheme();

    const onChange = () => {
      if (theme === "system") applyTheme();
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }
});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class={shellClass}>
  <Toaster richColors position="top-center" />
  <div class="flex min-h-screen">
    {#if !isLoginPage}
      {#if SidebarComp}
        <SidebarComp />
      {/if}
    {/if}
    <div class="flex-1" class:pl-72={!isLoginPage}>
      <main
        class={`mx-auto ${
          isLoginPage ? "max-w-lg px-4 py-12" : "max-w-6xl px-12 py-12"
        } flex flex-col gap-10`}
      >
        {@render children()}
      </main>
    </div>
  </div>
</div>
