<script lang="ts">
	import { supabase } from "$lib/utils/supabase";
	import { toast } from "svelte-sonner";
	import { i18n, t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { theme } from "$lib/state/theme.svelte";
	import { Sun, Moon, Globe } from "@lucide/svelte";
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "$lib/components/ui/dropdown-menu";

	let email = $state("");
	let password = $state("");
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		if (!email || !password) return toast.error(t("auth.invalidCredentials"));

		loading = true;
		try {
			const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
			if (error || !authData.user) { toast.error(t("auth.invalidCredentials")); loading = false; return; }

			toast.success(t("auth.welcomeBack"));
			const role = authData.user.user_metadata?.role as string | undefined;
			let route = "/admin";
			if (role === "secretary") route = "/secretary";
			else if (role === "staff") route = "/staff";
			else if (!role) {
				const { data } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
				if (data?.role === "secretary") route = "/secretary";
				else if (data?.role === "staff") route = "/staff";
			}
			window.location.href = route;
		} catch { toast.error(t("common.error")); loading = false; }
	}

	async function handleForgotPassword() {
		if (!email) return toast.error("Enter your email first");
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
			if (error) throw error;
			toast.success(t("auth.resetEmailSent"));
		} catch { toast.error(t("common.error")); }
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex items-center justify-between border-b px-4 py-3">
		<span class="text-lg font-bold">clubOS</span>
		<div class="flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger><Button variant="ghost" size="icon"><Globe class="h-4 w-4" /></Button></DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => i18n.setLocale("en")}>English</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => i18n.setLocale("el")}>Ελληνικά</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>{#if theme.isDark}<Sun class="h-4 w-4" />{:else}<Moon class="h-4 w-4" />{/if}</Button>
		</div>
	</header>

	<main class="flex flex-1 items-center justify-center p-4">
		<Card class="w-full max-w-sm">
			<CardHeader class="text-center"><CardTitle class="text-2xl">{t("auth.login")}</CardTitle><CardDescription>{t("auth.subtitle")}</CardDescription></CardHeader>
			<CardContent>
				<form onsubmit={handleLogin} class="space-y-4">
					<div class="space-y-2"><Label for="email">{t("auth.email")}</Label><Input id="email" type="email" placeholder="email@example.com" bind:value={email} required /></div>
					<div class="space-y-2">
						<div class="flex items-center justify-between"><Label for="password">{t("auth.password")}</Label><button type="button" class="text-xs text-primary hover:underline" onclick={handleForgotPassword}>{t("auth.forgotPassword")}</button></div>
						<Input id="password" type="password" bind:value={password} required />
					</div>
					<Button type="submit" class="w-full" disabled={loading}>{loading ? t("auth.signingIn") : t("auth.login")}</Button>
				</form>
			</CardContent>
		</Card>
	</main>
</div>
