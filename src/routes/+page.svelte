<script lang="ts">
import { SignIn } from "svelte-clerk";
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
	<main class="flex flex-1 items-center justify-center p-4">
		<Card class="w-full max-w-sm">
			<CardHeader class="text-center">
				<CardTitle class="text-2xl">{t("auth.login")}</CardTitle>
				<CardDescription>{t("auth.subtitle")}</CardDescription>
			</CardHeader>
			<CardContent>
				<SignIn
					routing="hash"
					signUpUrl="/signup"
					forceRedirectUrl="/"
					appearance={{
						elements: {
							rootBox: "w-full",
							card: "shadow-none p-0",
							header: "hidden",
							socialButtonsBlockButton: "text-sm",
							formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm",
						},
					}}
				/>
				<p class="mt-4 text-center text-sm text-muted-foreground">
					{t("signup.dontHaveAccount")} <a href="/signup" class="text-primary hover:underline">{t("signup.signUpNow")}</a>
				</p>
			</CardContent>
		</Card>
	</main>
</div>
