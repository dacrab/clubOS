<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { PLANS, type Plan } from "$lib/config/auth";
	import { Building2, Users, Zap, Check, Loader2 } from "@lucide/svelte";

	type Props = {
		loading?: boolean;
		selectedPlan?: Plan | null;
		onSelect: (plan: Plan) => void;
		variant?: "grid" | "list";
	};

	let { loading = false, selectedPlan = null, onSelect, variant = "grid" }: Props = $props();

	const icons = { Building2, Users, Zap };
</script>

{#if variant === "grid"}
	<div class="grid gap-6 md:grid-cols-3">
		{#each PLANS as plan (plan.id)}
			{@const Icon = icons[plan.icon as keyof typeof icons]}
			<Card class="relative flex flex-col transition-smooth hover:border-primary {plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}">
				{#if plan.popular}
					<div class="absolute -top-3 left-1/2 -translate-x-1/2">
						<span class="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{t("signup.popular")}</span>
					</div>
				{/if}
				<CardHeader>
					<div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon class="h-5 w-5 text-primary" /></div>
					<CardTitle>{plan.name}</CardTitle>
					<CardDescription>{t(plan.descriptionKey)}</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-1 flex-col">
					<div class="mb-4"><span class="text-3xl font-bold">{plan.price}</span><span class="text-muted-foreground">/{t("signup.perMonth")}</span></div>
					<ul class="mb-6 flex-1 space-y-2">
						{#each plan.featureKeys as key, i (i)}
							<li class="flex items-start gap-2 text-sm"><Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-success" /><span>{t(key)}</span></li>
						{/each}
					</ul>
					<Button class="w-full" variant={plan.popular ? "default" : "outline"} onclick={() => onSelect(plan.id)} disabled={loading}>
						{#if loading && selectedPlan === plan.id}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
						{t("billing.subscribe")}
					</Button>
				</CardContent>
			</Card>
		{/each}
	</div>
{:else}
	<div class="grid gap-4">
		{#each PLANS as plan (plan.id)}
			{@const Icon = icons[plan.icon as keyof typeof icons]}
			<button
				type="button"
				onclick={() => onSelect(plan.id)}
				disabled={loading}
				class="relative flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-muted/50 {plan.popular ? 'border-primary ring-1 ring-primary/20' : ''} {selectedPlan === plan.id ? 'border-primary bg-primary/5' : ''}"
			>
				{#if plan.popular}
					<span class="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">{t("signup.popular")}</span>
				{/if}
				<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon class="h-5 w-5 text-primary" /></div>
				<div class="flex-1 min-w-0">
					<div class="flex items-center justify-between">
						<span class="font-semibold">{plan.name}</span>
						<span class="text-lg font-bold">{plan.price}<span class="text-sm font-normal text-muted-foreground">/{t("signup.perMonth")}</span></span>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">{t(plan.descriptionKey)}</p>
					<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
						{#each plan.featureKeys.slice(0, 3) as key, i (i)}
							<li class="flex items-center gap-1 text-xs text-muted-foreground"><Check class="h-3 w-3 text-success" />{t(key)}</li>
						{/each}
					</ul>
				</div>
			</button>
		{/each}
	</div>
{/if}
