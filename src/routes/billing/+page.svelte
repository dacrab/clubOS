<script lang="ts">
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Building2, Users, Zap, Check, Loader2, AlertCircle } from "@lucide/svelte";

	type Plan = "basic" | "pro" | "enterprise";

	const { data } = $props();

	let loading = $state(false);
	let selectedPlan = $state<Plan | null>(null);

	const plans = [
		{
			id: "basic" as Plan,
			name: "Basic",
			price: "€29",
			priceId: "price_1Sc4wV9fJvoeQ48O2RI2I9bl",
			description: t("signup.plans.basic.description"),
			features: [
				t("signup.plans.basic.feature1"),
				t("signup.plans.basic.feature2"),
				t("signup.plans.basic.feature3"),
				t("signup.plans.basic.feature4"),
			],
			icon: Building2,
		},
		{
			id: "pro" as Plan,
			name: "Pro",
			price: "€59",
			priceId: "price_1Sc4wV9fJvoeQ48Ot0p9YmNm",
			description: t("signup.plans.pro.description"),
			features: [
				t("signup.plans.pro.feature1"),
				t("signup.plans.pro.feature2"),
				t("signup.plans.pro.feature3"),
				t("signup.plans.pro.feature4"),
				t("signup.plans.pro.feature5"),
			],
			icon: Users,
			popular: true,
		},
		{
			id: "enterprise" as Plan,
			name: "Enterprise",
			price: "€149",
			priceId: "price_1Sc4wV9fJvoeQ48OdmvyM2jy",
			description: t("signup.plans.enterprise.description"),
			features: [
				t("signup.plans.enterprise.feature1"),
				t("signup.plans.enterprise.feature2"),
				t("signup.plans.enterprise.feature3"),
				t("signup.plans.enterprise.feature4"),
				t("signup.plans.enterprise.feature5"),
			],
			icon: Zap,
		},
	];

	async function selectPlanAndCheckout(planId: Plan) {
		selectedPlan = planId;
		const plan = plans.find((p) => p.id === planId);
		if (!plan || !data.user) return;

		loading = true;
		try {
			const res = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					priceId: plan.priceId,
					userId: data.user.id,
					email: data.user.email,
					tenantId: data.tenantId,
				}),
			});

			const { url, error: stripeError } = await res.json();
			if (stripeError) throw new Error(stripeError);

			window.location.href = url;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("common.error"));
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex items-center justify-between border-b px-4 py-4">
		<span class="text-lg font-bold">clubOS</span>
		<form action="/logout" method="POST">
			<Button variant="ghost" size="sm" type="submit">{t("auth.logout")}</Button>
		</form>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<div class="w-full max-w-4xl">
			<div class="mb-8 text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
					<AlertCircle class="h-8 w-8 text-warning" />
				</div>
				<h1 class="text-3xl font-bold">{t("billing.subscriptionRequired")}</h1>
				<p class="mt-2 text-muted-foreground">{t("billing.subscriptionRequiredDesc")}</p>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				{#each plans as plan (plan.id)}
					<Card class="relative flex flex-col transition-smooth hover:border-primary {plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}">
						{#if plan.popular}
							<div class="absolute -top-3 left-1/2 -translate-x-1/2">
								<span class="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
									{t("signup.popular")}
								</span>
							</div>
						{/if}
						<CardHeader>
							<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<plan.icon class="h-5 w-5 text-primary" />
							</div>
							<CardTitle>{plan.name}</CardTitle>
							<CardDescription>{plan.description}</CardDescription>
						</CardHeader>
						<CardContent class="flex flex-1 flex-col">
							<div class="mb-4">
								<span class="text-3xl font-bold">{plan.price}</span>
								<span class="text-muted-foreground">/{t("signup.perMonth")}</span>
							</div>
							<ul class="mb-6 flex-1 space-y-2">
								{#each plan.features as feature, i (i)}
									<li class="flex items-start gap-2 text-sm">
										<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
										<span>{feature}</span>
									</li>
								{/each}
							</ul>
							<Button 
								class="w-full" 
								variant={plan.popular ? "default" : "outline"} 
								onclick={() => selectPlanAndCheckout(plan.id)}
								disabled={loading}
							>
								{#if loading && selectedPlan === plan.id}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								{t("billing.subscribe")}
							</Button>
						</CardContent>
					</Card>
				{/each}
			</div>

			<p class="mt-8 text-center text-sm text-muted-foreground">
				{t("billing.securePayment")}
			</p>
		</div>
	</main>
</div>
