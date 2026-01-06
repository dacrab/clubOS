<script lang="ts">
	import { supabase } from "$lib/utils/supabase";
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { PublicHeader } from "$lib/components/layout";
	import { getHomeForRole } from "$lib/config/auth";

	let email = $state("");
	let password = $state("");
	let loading = $state(false);

	async function handleLogin(e: Event): Promise<void> {
		e.preventDefault();
		if (!email || !password) { toast.error(t("auth.invalidCredentials")); return; }

		loading = true;
		try {
			const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
			if (error || !authData.user) {
				toast.error(t("auth.invalidCredentials"));
				loading = false;
				return;
			}

			toast.success(t("auth.welcomeBack"));
			const { data: membership } = await supabase
				.from("memberships")
				.select("role")
				.eq("user_id", authData.user.id)
				.order("is_primary", { ascending: false })
				.limit(1)
				.single();

			window.location.href = membership ? getHomeForRole(membership.role) : "/onboarding";
		} catch {
			toast.error(t("common.error"));
			loading = false;
		}
	}

	async function handleForgotPassword(): Promise<void> {
		if (!email) { toast.error(t("auth.enterEmailFirst")); return; }
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
			if (error) throw error;
			toast.success(t("auth.resetEmailSent"));
		} catch {
			toast.error(t("common.error"));
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<PublicHeader />
	<main class="flex flex-1 items-center justify-center p-4">
		<Card class="w-full max-w-sm">
			<CardHeader class="text-center">
				<CardTitle class="text-2xl">{t("auth.login")}</CardTitle>
				<CardDescription>{t("auth.subtitle")}</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleLogin} class="space-y-4">
					<div class="space-y-2">
						<Label for="email">{t("auth.email")}</Label>
						<Input id="email" type="email" placeholder="email@example.com" bind:value={email} required />
					</div>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="password">{t("auth.password")}</Label>
							<button type="button" class="text-xs text-primary hover:underline" onclick={handleForgotPassword}>{t("auth.forgotPassword")}</button>
						</div>
						<Input id="password" type="password" bind:value={password} required />
					</div>
					<Button type="submit" class="w-full" disabled={loading}>{loading ? t("auth.signingIn") : t("auth.login")}</Button>
				</form>
				<p class="mt-4 text-center text-sm text-muted-foreground">
					{t("signup.dontHaveAccount")} <a href="/signup" class="text-primary hover:underline">{t("signup.signUpNow")}</a>
				</p>
			</CardContent>
		</Card>
	</main>
</div>
