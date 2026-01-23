<script lang="ts">
	import { supabase } from "$lib/utils/supabase";
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "$lib/components/ui/card";
	import { PublicHeader } from "$lib/components/layout";
	import { ArrowRight, Loader2 } from "@lucide/svelte";

	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let fullName = $state("");
	let loading = $state(false);

	async function handleSignup(e: Event): Promise<void> {
		e.preventDefault();
		if (!email || !password || !confirmPassword || !fullName) { toast.error(t("signup.fillAllFields")); return; }
		if (password !== confirmPassword) { toast.error(t("auth.passwordMismatch")); return; }
		if (password.length < 8) { toast.error(t("signup.passwordTooShort")); return; }

		loading = true;
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: { data: { full_name: fullName, role: "admin" }, emailRedirectTo: `${window.location.origin}/onboarding` },
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
	<PublicHeader />
	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<Card class="w-full max-w-md">
			<CardHeader class="text-center">
				<CardTitle class="text-2xl">{t("signup.createAccount")}</CardTitle>
				<CardDescription>{t("signup.createAccountDesc")}</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleSignup} class="space-y-4">
					<div class="space-y-2"><Label for="fullName">{t("signup.fullName")}</Label><Input id="fullName" placeholder={t("signup.fullNamePlaceholder")} bind:value={fullName} required /></div>
					<div class="space-y-2"><Label for="email">{t("auth.email")}</Label><Input id="email" type="email" placeholder="email@example.com" bind:value={email} required /></div>
					<div class="space-y-2"><Label for="password">{t("auth.password")}</Label><Input id="password" type="password" placeholder={t("signup.passwordPlaceholder")} bind:value={password} required /></div>
					<div class="space-y-2"><Label for="confirmPassword">{t("auth.confirmPassword")}</Label><Input id="confirmPassword" type="password" placeholder={t("signup.confirmPasswordPlaceholder")} bind:value={confirmPassword} required /></div>
					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{t("signup.creatingAccount")}{:else}{t("signup.createAccountBtn")}<ArrowRight class="ml-2 h-4 w-4" />{/if}
					</Button>
				</form>
			</CardContent>
			<CardFooter class="flex-col gap-4 text-center">
				<p class="text-xs text-muted-foreground">{t("signup.termsNotice")}</p>
				<p class="text-sm text-muted-foreground">{t("signup.alreadyHaveAccount")} <a href="/" class="text-primary hover:underline">{t("auth.login")}</a></p>
			</CardFooter>
		</Card>
	</main>
</div>
