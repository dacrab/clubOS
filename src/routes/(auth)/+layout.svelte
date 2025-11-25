<script lang="ts">
import { MonitorCog, Moon, Sun } from "@lucide/svelte";
import { i18nState, t } from "$lib/state/i18n.svelte";

const { children } = $props();

function cycleTheme() {
	if (typeof window === "undefined") return;
	const current = localStorage.getItem("theme") || "system";
	const order = ["light", "dark", "system"];
	const next = order[(order.indexOf(current) + 1) % order.length];

	localStorage.setItem("theme", next);
	const root = document.documentElement;
	const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

	if (next === "dark" || (next === "system" && systemDark)) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}
</script>

<div class="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
	<div class="absolute right-4 top-4 flex items-center gap-2">
		<div class="flex items-center rounded-full border border-border bg-background p-1 shadow-sm">
			<button
				class="rounded-full px-3 py-1 text-xs font-medium transition-colors {i18nState.locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => i18nState.locale = 'en'}
			>
				EN
			</button>
			<button
				class="rounded-full px-3 py-1 text-xs font-medium transition-colors {i18nState.locale === 'el' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => i18nState.locale = 'el'}
			>
				EL
			</button>
		</div>
		<button
			class="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground shadow-sm transition-colors"
			onclick={cycleTheme}
		>
			<Sun class="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon class="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
		</button>
	</div>

	<main class="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
		{@render children()}
	</main>
</div>
