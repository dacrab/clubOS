<script lang="ts">
	import { supabase } from "$lib/utils/supabase";
	import { toast } from "svelte-sonner";
	import { i18n, t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "$lib/components/ui/card";
	import { theme } from "$lib/state/theme.svelte";
	import { Sun, Moon, Globe, ArrowRight, Loader2 } from "@lucide/svelte";
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "$lib/components/ui/dropdown-menu";

	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let fullName = $state("");
	let loading = $state(false);

	async function handleSignup(e: Event) {
		e.preventDefault();
		if (!email || !password || !confirmPassword || !fullName) {
			return toast.error(t("signup.fillAllFields"));
		}
		if (password !== confirmPassword) {
			return toast.error(t("auth.passwordMismatch"));
		}
		if (password.length < 8) {
			return toast.error(t("signup.passwordTooShort"));
		}

		loading = true;
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
						role: "admin",
					},
					emailRedirectTo: `${window.location.origin}/onboarding`,
				},
			});

			if (error) throw error;
			if (!data.user) throw new Error("Signup failed");

			toast.success(t("signup.accountCreated"));
			window.location.href = "/onboarding";
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("common.error"));
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex items-center justify-between border-b px-4 py-3">
		<a href="/" class="text-lg font-bold">clubOS</a>
		<div class="flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger><Globe class="h-4 w-4" /></DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => i18n.setLocale("en")}>English</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => i18n.setLocale("el")}>Ελληνικά</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>{#if theme.isDark}<Sun class="h-4 w-4" />{:else}<Moon class="h-4 w-4" />{/if}</Button>
		</div>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<Card class="w-full max-w-md animate-fade-in">
			<CardHeader class="text-center">
				<CardTitle class="text-2xl">{t("signup.createAccount")}</CardTitle>
				<CardDescription>{t("signup.createAccountDesc")}</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleSignup} class="space-y-4">
					<div class="space-y-2">
						<Label for="fullName">{t("signup.fullName")}</Label>
						<Input id="fullName" type="text" placeholder={t("signup.fullNamePlaceholder")} bind:value={fullName} required />
					</div>
					<div class="space-y-2">
						<Label for="email">{t("auth.email")}</Label>
						<Input id="email" type="email" placeholder="email@example.com" bind:value={email} required />
					</div>
					<div class="space-y-2">
						<Label for="password">{t("auth.password")}</Label>
						<Input id="password" type="password" placeholder={t("signup.passwordPlaceholder")} bind:value={password} required />
					</div>
					<div class="space-y-2">
						<Label for="confirmPassword">{t("auth.confirmPassword")}</Label>
						<Input id="confirmPassword" type="password" placeholder={t("signup.confirmPasswordPlaceholder")} bind:value={confirmPassword} required />
					</div>
					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{t("signup.creatingAccount")}
						{:else}
							{t("signup.createAccountBtn")}
							<ArrowRight class="ml-2 h-4 w-4" />
						{/if}
					</Button>
				</form>
			</CardContent>
			<CardFooter class="flex-col gap-4 text-center">
				<p class="text-xs text-muted-foreground">{t("signup.termsNotice")}</p>
				<p class="text-sm text-muted-foreground">
					{t("signup.alreadyHaveAccount")} <a href="/" class="text-primary hover:underline">{t("auth.login")}</a>
				</p>
			</CardFooter>
		</Card>
	</main>
</div>
