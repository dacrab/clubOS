<script lang="ts">
import Moon from "@lucide/svelte/icons/moon";
import Sun from "@lucide/svelte/icons/sun";

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
</script>

<header class="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
  <div class="max-w-6xl mx-auto px-6 h-12 flex items-center gap-3">
    <div class="flex-1 font-medium tracking-tight">clubOS</div>
    <button class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors" type="button" onclick={toggleTheme}>
      {#if theme === 'dark'}
        <Sun class="size-4" />
      {:else}
        <Moon class="size-4" />
      {/if}
    </button>
  </div>
</header>
