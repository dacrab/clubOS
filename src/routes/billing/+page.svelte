<script lang="ts">
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import PlanSelector from "$lib/components/features/plan-selector.svelte";
	import Header from "$lib/components/layout/header.svelte";
	import { PLANS, type Plan } from "$lib/config/auth";
	import { AlertCircle } from "@lucide/svelte";

	const { data } = $props();

	let loading = $state(false);
	let selectedPlan = $state<Plan | null>(null);

	async function handleSelect(planId: Plan) {
		if (!data.user?.id || !data.user?.email) {
			toast.error(t("common.error"));
			return;
		}
		selectedPlan = planId;
		const plan = PLANS.find((p) => p.id === planId);
		if (!plan) return;

		loading = true;
		try {
			const res = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ priceId: plan.priceId, userId: data.user.id, email: data.user.email, tenantId: data.tenantId }),
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

<div class="page-public">
	<Header public />

	<main class="flex flex-1 flex-col items-center justify-center p-4">
		<div class="w-full max-w-4xl">
			<div class="mb-8 text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
					<AlertCircle class="h-8 w-8 text-warning" />
				</div>
				<h1 class="text-3xl font-bold">{t("billing.subscriptionRequired")}</h1>
				<p class="mt-2 text-muted-foreground">{t("billing.subscriptionRequiredDesc")}</p>
			</div>

			<PlanSelector {loading} {selectedPlan} onSelect={handleSelect} variant="grid" />

			<p class="mt-8 text-center text-sm text-muted-foreground">{t("billing.securePayment")}</p>
		</div>
	</main>
</div>
