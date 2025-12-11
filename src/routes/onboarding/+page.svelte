<script lang="ts">
	import { toast } from "svelte-sonner";
	import { t } from "$lib/i18n/index.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Select, SelectTrigger, SelectContent, SelectItem } from "$lib/components/ui/select";
	import { Building2, MapPin, Phone, Mail, Users, Check, Loader2, Zap } from "@lucide/svelte";

	type Step = 1 | 2 | 3;
	type Plan = "basic" | "pro" | "enterprise";

	const { data } = $props();

	let currentStep = $state<Step>(1);
	let loading = $state(false);
	let completed = $state(false);
	let selectedPlan = $state<Plan | null>(null);

	let tenantName = $state("");
	let facilityName = $state("");
	let facilityAddress = $state("");
	let facilityPhone = $state("");
	let facilityEmail = $state("");
	let timezone = $state("Europe/Athens");
	let staffCount = $state("1-5");

	const timezones = [
		{ value: "Europe/Athens", label: "Athens (GMT+2/+3)" },
		{ value: "Europe/London", label: "London (GMT+0/+1)" },
		{ value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
		{ value: "Europe/Berlin", label: "Berlin (GMT+1/+2)" },
		{ value: "America/New_York", label: "New York (GMT-5/-4)" },
		{ value: "America/Los_Angeles", label: "Los Angeles (GMT-8/-7)" },
	];

	const staffOptions = [
		{ value: "1-5", label: "1-5" },
		{ value: "6-15", label: "6-15" },
		{ value: "16-30", label: "16-30" },
		{ value: "30+", label: "30+" },
	];

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

	const steps = [
		{ number: 1, title: t("onboarding.step1Title"), description: t("onboarding.step1Desc") },
		{ number: 2, title: t("onboarding.step2Title"), description: t("onboarding.step2Desc") },
		{ number: 3, title: t("onboarding.step3Title"), description: t("onboarding.step3Desc") },
	];

	function nextStep() {
		if (currentStep === 1 && !tenantName) {
			return toast.error(t("onboarding.enterBusinessName"));
		}
		if (currentStep === 2 && !facilityName) {
			return toast.error(t("onboarding.enterFacilityName"));
		}
		if (currentStep < 3) {
			currentStep = (currentStep + 1) as Step;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep = (currentStep - 1) as Step;
		}
	}

	async function selectPlanAndCheckout(planId: Plan) {
		selectedPlan = planId;
		const plan = plans.find((p) => p.id === planId);
		if (!plan || !data.user) return;

		loading = true;
		try {
			// First save the onboarding data
			const onboardingRes = await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tenant: {
						name: tenantName,
						slug: tenantName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
					},
					facility: {
						name: facilityName,
						address: facilityAddress || null,
						phone: facilityPhone || null,
						email: facilityEmail || null,
						timezone,
					},
					staffCount,
				}),
			});

			const onboardingResult = await onboardingRes.json();
			if (!onboardingRes.ok) throw new Error(onboardingResult.error);

			// Then redirect to Stripe checkout
			const tenantId = onboardingResult.tenant?.id || onboardingResult.tenantId;
			const res = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					priceId: plan.priceId,
					userId: data.user.id,
					email: data.user.email,
					tenantId,
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

	async function skipPaymentForNow() {
		loading = true;
		try {
			const res = await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tenant: {
						name: tenantName,
						slug: tenantName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
					},
					facility: {
						name: facilityName,
						address: facilityAddress || null,
						phone: facilityPhone || null,
						email: facilityEmail || null,
						timezone,
					},
					staffCount,
				}),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error);

			completed = true;
			toast.success(t("onboarding.completed"));

			setTimeout(() => {
				window.location.href = "/admin";
			}, 2000);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("common.error"));
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex items-center justify-center border-b px-4 py-4">
		<span class="text-lg font-bold">clubOS</span>
	</header>

	<main class="flex flex-1 items-center justify-center p-4">
		{#if completed}
			<Card class="w-full max-w-md animate-scale-in text-center">
				<CardContent class="pt-8">
					<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
						<Check class="h-8 w-8 text-success" />
					</div>
					<h2 class="text-2xl font-bold">{t("onboarding.welcomeTitle")}</h2>
					<p class="mt-2 text-muted-foreground">{t("onboarding.welcomeDesc")}</p>
					<div class="mt-6">
						<div class="flex items-center justify-center gap-2 text-muted-foreground">
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>{t("onboarding.redirecting")}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		{:else}
			<div class="w-full max-w-2xl">
				<div class="mb-8">
					<div class="flex items-center justify-between">
						{#each steps as step, i (step.number)}
							<div class="flex flex-1 items-center">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full transition-smooth {currentStep >= step.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
										{#if currentStep > step.number}
											<Check class="h-5 w-5" />
										{:else}
											{step.number}
										{/if}
									</div>
									<div class="hidden sm:block">
										<p class="text-sm font-medium">{step.title}</p>
										<p class="text-xs text-muted-foreground">{step.description}</p>
									</div>
								</div>
								{#if i < steps.length - 1}
									<div class="mx-4 h-0.5 flex-1 transition-smooth {currentStep > step.number ? 'bg-primary' : 'bg-muted'}"></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<Card class="animate-fade-in">
					<CardHeader>
						<CardTitle>{steps[currentStep - 1].title}</CardTitle>
						<CardDescription>{steps[currentStep - 1].description}</CardDescription>
					</CardHeader>
					<CardContent>
						{#if currentStep === 1}
							<div class="space-y-4">
								<div class="space-y-2">
									<Label for="tenantName">{t("onboarding.businessName")} *</Label>
									<div class="relative">
										<Building2 class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input id="tenantName" class="pl-10" placeholder={t("onboarding.businessNamePlaceholder")} bind:value={tenantName} required />
									</div>
								</div>
								<div class="space-y-2">
									<Label for="staffCount">{t("onboarding.staffCount")}</Label>
									<Select value={staffCount} onValueChange={(v) => staffCount = v || "1-5"}>
										<SelectTrigger selected={staffOptions.find(o => o.value === staffCount)?.label + " " + t("onboarding.employees")} placeholder={t("onboarding.selectStaffCount")} />
										<SelectContent>
											{#each staffOptions as option (option.value)}
												<SelectItem value={option.value}>{option.label} {t("onboarding.employees")}</SelectItem>
											{/each}
										</SelectContent>
									</Select>
								</div>
							</div>
						{:else if currentStep === 2}
							<div class="space-y-4">
								<div class="space-y-2">
									<Label for="facilityName">{t("onboarding.facilityName")} *</Label>
									<div class="relative">
										<Building2 class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input id="facilityName" class="pl-10" placeholder={t("onboarding.facilityNamePlaceholder")} bind:value={facilityName} required />
									</div>
								</div>
								<div class="space-y-2">
									<Label for="facilityAddress">{t("onboarding.address")}</Label>
									<div class="relative">
										<MapPin class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input id="facilityAddress" class="pl-10" placeholder={t("onboarding.addressPlaceholder")} bind:value={facilityAddress} />
									</div>
								</div>
								<div class="grid gap-4 sm:grid-cols-2">
									<div class="space-y-2">
										<Label for="facilityPhone">{t("onboarding.phone")}</Label>
										<div class="relative">
											<Phone class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input id="facilityPhone" class="pl-10" type="tel" placeholder="+30 210 1234567" bind:value={facilityPhone} />
										</div>
									</div>
									<div class="space-y-2">
										<Label for="facilityEmail">{t("onboarding.email")}</Label>
										<div class="relative">
											<Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input id="facilityEmail" class="pl-10" type="email" placeholder="contact@facility.com" bind:value={facilityEmail} />
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="space-y-4">
								<div class="space-y-2 mb-4">
									<Label for="timezone">{t("onboarding.timezone")}</Label>
									<Select value={timezone} onValueChange={(v) => timezone = v || "Europe/Athens"}>
										<SelectTrigger selected={timezones.find(tz => tz.value === timezone)?.label} placeholder={t("onboarding.selectTimezone")} />
										<SelectContent>
											{#each timezones as tz (tz.value)}
												<SelectItem value={tz.value}>{tz.label}</SelectItem>
											{/each}
										</SelectContent>
									</Select>
								</div>

								<div class="pt-4 border-t">
									<h4 class="font-medium mb-4">{t("onboarding.choosePlan")}</h4>
									<div class="grid gap-4">
										{#each plans as plan (plan.id)}
											<button
												type="button"
												onclick={() => selectPlanAndCheckout(plan.id)}
												disabled={loading}
												class="relative flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-muted/50 {plan.popular ? 'border-primary ring-1 ring-primary/20' : ''} {selectedPlan === plan.id ? 'border-primary bg-primary/5' : ''}"
											>
												{#if plan.popular}
													<span class="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
														{t("signup.popular")}
													</span>
												{/if}
												<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
													<plan.icon class="h-5 w-5 text-primary" />
												</div>
												<div class="flex-1 min-w-0">
													<div class="flex items-center justify-between">
														<span class="font-semibold">{plan.name}</span>
														<span class="text-lg font-bold">{plan.price}<span class="text-sm font-normal text-muted-foreground">/{t("signup.perMonth")}</span></span>
													</div>
													<p class="mt-1 text-sm text-muted-foreground">{plan.description}</p>
													<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
														{#each plan.features.slice(0, 3) as feature, i (i)}
															<li class="flex items-center gap-1 text-xs text-muted-foreground">
																<Check class="h-3 w-3 text-success" />
																{feature}
															</li>
														{/each}
													</ul>
												</div>
											</button>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</CardContent>
					<div class="flex justify-between border-t p-6">
						<Button variant="outline" onclick={prevStep} disabled={currentStep === 1 || loading}>
							{t("onboarding.previous")}
						</Button>
						{#if currentStep < 3}
							<Button onclick={nextStep}>
								{t("onboarding.next")}
							</Button>
						{:else}
							<Button variant="ghost" onclick={skipPaymentForNow} disabled={loading}>
								{#if loading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								{t("onboarding.skipForNow")}
							</Button>
						{/if}
					</div>
				</Card>
			</div>
		{/if}
	</main>
</div>
