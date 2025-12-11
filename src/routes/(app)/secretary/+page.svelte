<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { PageHeader } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Cake, Dribbble, Calendar } from "@lucide/svelte";

	const { data } = $props();
</script>

<div class="space-y-6">
	<PageHeader title={t("dashboard.title")} description={t("dashboard.overview")} />

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2"><CardTitle class="text-sm font-medium">{t("bookings.upcomingBirthdays")}</CardTitle><Cake class="h-4 w-4 text-muted-foreground" /></CardHeader>
			<CardContent><p class="text-2xl font-bold">{data.upcomingBirthdays}</p></CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2"><CardTitle class="text-sm font-medium">{t("bookings.upcomingFootball")}</CardTitle><Dribbble class="h-4 w-4 text-muted-foreground" /></CardHeader>
			<CardContent><p class="text-2xl font-bold">{data.upcomingFootball}</p></CardContent>
		</Card>
		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2"><CardTitle class="text-sm font-medium">{t("bookings.thisMonth")}</CardTitle><Calendar class="h-4 w-4 text-muted-foreground" /></CardHeader>
			<CardContent><p class="text-2xl font-bold">{data.thisMonthTotal}</p></CardContent>
		</Card>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card>
			<CardHeader><CardTitle class="flex items-center gap-2"><Cake class="h-5 w-5" />{t("nav.birthdays")}</CardTitle><CardDescription>{t("bookings.birthdaysDesc")}</CardDescription></CardHeader>
			<CardContent><Button href="/secretary/birthdays" class="w-full">{t("common.viewAll")}</Button></CardContent>
		</Card>
		<Card>
			<CardHeader><CardTitle class="flex items-center gap-2"><Dribbble class="h-5 w-5" />{t("nav.football")}</CardTitle><CardDescription>{t("bookings.footballDesc")}</CardDescription></CardHeader>
			<CardContent><Button href="/secretary/football" class="w-full">{t("common.viewAll")}</Button></CardContent>
		</Card>
	</div>
</div>
