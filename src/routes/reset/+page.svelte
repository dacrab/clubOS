<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/utils/supabase";
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import Input from "$lib/components/ui/input/input.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";

	let password = $state("");
	let confirmPassword = $state("");
	let loading = $state(false);

	async function handleReset(e: Event) {
		e.preventDefault();

		if (!password || !confirmPassword) {
			toast.error(t("auth.fillAllFields"));
			return;
		}

		if (password !== confirmPassword) {
			toast.error(t("auth.passwordMismatch"));
			return;
		}

		loading = true;
		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;

			toast.success(t("auth.passwordUpdated"));
			await goto("/");
		} catch {
			toast.error(t("common.error"));
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-sm">
		<CardHeader class="text-center">
			<CardTitle>{t("auth.resetPassword")}</CardTitle>
			<CardDescription>{t("auth.resetPasswordDesc")}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleReset} class="space-y-4">
				<div class="space-y-2">
					<Label for="password">{t("auth.newPassword")}</Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="confirm">{t("auth.confirmPassword")}</Label>
					<Input
						id="confirm"
						type="password"
						bind:value={confirmPassword}
						required
					/>
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? t("common.loading") : t("auth.resetPassword")}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
