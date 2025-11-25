<script lang="ts">
import { LogOut, Moon, Sun } from "@lucide/svelte";
import { page } from "$app/state";
import { Button } from "$lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import { i18nState, t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";

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

async function logout() {
	await fetch("/logout", { method: "POST" });
	window.location.href = "/";
}

const title = $derived.by(() => {
	const path = page.url.pathname;
	if (path.includes("/admin/products")) return t("nav.products");
	if (path.includes("/admin/users")) return t("nav.users");
	if (path.includes("/admin/orders")) return t("nav.orders");
	if (path.includes("/admin/registers")) return t("nav.registers");
	if (path.includes("/admin/settings")) return t("nav.settings");
	if (path.includes("/secretary")) return t("nav.bookings");
	return t("nav.dashboard");
});
</script>

<header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-sm">
	<div class="flex items-center gap-4">
		<h1 class="text-lg font-semibold text-foreground">{title}</h1>
	</div>

	<div class="flex items-center gap-2">
		<!-- Language -->
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="ghost" size="icon" class="rounded-full">
					<span class="text-xs font-bold">{i18nState.locale.toUpperCase()}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onclick={() => i18nState.locale = "en"}>English</DropdownMenuItem>
				<DropdownMenuItem onclick={() => i18nState.locale = "el"}>Ελληνικά</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>

		<!-- Theme -->
		<Button variant="ghost" size="icon" class="rounded-full" onclick={cycleTheme}>
			<Sun class="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon class="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span class="sr-only">Toggle theme</span>
		</Button>

		<!-- User Profile -->
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="ghost" size="icon" class="rounded-full">
					<div class="size-8 rounded-full bg-primary/10 text-primary grid place-items-center font-medium">
						{userState.current?.username?.[0]?.toUpperCase() ?? "U"}
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-56">
				<DropdownMenuLabel>
					<div class="flex flex-col space-y-1">
						<p class="text-sm font-medium leading-none">{userState.current?.username}</p>
						<p class="text-xs leading-none text-muted-foreground">{userState.current?.email}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onclick={logout} class="text-destructive focus:text-destructive">
					<LogOut class="mr-2 size-4" />
					<span>{t("nav.logout")}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</header>
