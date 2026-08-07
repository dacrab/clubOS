<script lang="ts">
import { SignUp } from "svelte-clerk";
import Header from "$lib/components/layout/header.svelte";
import Card, {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/card/card.svelte";
import { t } from "$lib/i18n/index.svelte";
</script>

<div class="page-public">
	<Header public />
	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<Card class="w-full max-w-md">
			<CardHeader class="text-center">
				<CardTitle class="text-2xl">{t("signup.createAccount")}</CardTitle>
				<CardDescription>{t("signup.createAccountDesc")}</CardDescription>
			</CardHeader>
			<CardContent>
				<SignUp
					routing="hash"
					signInUrl="/"
					forceRedirectUrl="/onboarding"
					appearance={{
						elements: {
							rootBox: "w-full",
							card: "shadow-none p-0",
							header: "hidden",
							formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm",
						},
					}}
				/>
				<p class="mt-4 text-center text-sm text-muted-foreground">
					{t("signup.alreadyHaveAccount")} <a href="/" class="text-primary hover:underline">{t("auth.login")}</a>
				</p>
			</CardContent>
		</Card>
	</main>
</div>
