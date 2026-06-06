<script lang="ts">
import {
	BarChart3,
	DollarSign,
	Layers,
	Package,
	Plus,
	ShoppingCart,
	Star,
	TrendingUp,
} from "@lucide/svelte";
import NewSaleDialog from "$lib/components/features/new-sale-dialog.svelte";
import RecentOrders from "$lib/components/features/recent-orders.svelte";
import RevenueChart from "$lib/components/features/revenue-chart.svelte";
import PageHeader from "$lib/components/layout/page-header.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card, { CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/card.svelte";
import { t } from "$lib/i18n/index.svelte";
import { fmtCurrency } from "$lib/utils/format";

const { data } = $props();

let showNewSaleDialog = $state(false);

type CategorySale = { name: string; quantity: number };
const totalCategorySales = $derived(
	data.analytics.categorySales.reduce((s: number, c: CategorySale) => s + c.quantity, 0),
);

const stats = $derived([
	{
		label: t("dashboard.todayRevenue"),
		value: fmtCurrency(data.stats.todayRevenue),
		icon: DollarSign,
		tone: "primary",
	},
	{
		label: t("dashboard.totalOrders"),
		value: data.stats.todayOrders,
		icon: ShoppingCart,
		tone: "blue",
	},
	{ label: t("dashboard.lowStock"), value: data.stats.lowStockCount, icon: Package, tone: "amber" },
	{
		label: t("dashboard.activeUsers"),
		value: data.stats.activeUsers,
		icon: TrendingUp,
		tone: "emerald",
	},
] as const);

const TONE_BG: Record<string, string> = {
	primary: "bg-primary/10",
	blue: "bg-blue-500/10",
	amber: "bg-amber-500/10",
	emerald: "bg-emerald-500/10",
};
const TONE_FG: Record<string, string> = {
	primary: "text-primary",
	blue: "text-blue-500",
	amber: "text-amber-500",
	emerald: "text-emerald-500",
};
</script>

<div class="space-y-6 animate-fade-in">
	<PageHeader title={t("dashboard.title")} description={t("dashboard.overview")}>
		{#snippet actions()}
			<Button onclick={() => (showNewSaleDialog = true)} class="press-effect">
				<Plus class="mr-2 icon-sm" />
				{t("orders.newSale")}
			</Button>
		{/snippet}
	</PageHeader>

	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
		{#each stats as s (s.label)}
			<Card class="hover-lift">
				<CardHeader class="flex flex-row flex-between pb-2">
					<CardTitle class="text-sm font-medium">{s.label}</CardTitle>
					<div class="rounded-lg p-2 {TONE_BG[s.tone]}">
						<s.icon class="icon-sm {TONE_FG[s.tone]}" />
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-2xl font-bold">{s.value}</p>
				</CardContent>
			</Card>
		{/each}
	</section>

	<section class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader class="flex flex-row flex-between">
				<CardTitle class="flex-center gap-2">
					<BarChart3 class="icon-md text-muted-foreground" />
					{t("dashboard.weeklyRevenue")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<RevenueChart days={data.analytics.revenueByDay} />
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row flex-between">
				<CardTitle class="flex-center gap-2">
					<Layers class="icon-md text-muted-foreground" />
					{t("dashboard.salesByCategory")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.categorySales.length === 0}
					<div class="flex h-64 items-center justify-center text-muted-foreground">
						<div class="flex flex-col items-center gap-2">
							<Layers class="h-12 w-12 opacity-30" />
							<p class="text-sm">{t("common.noResults")}</p>
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.analytics.categorySales as category (category.name)}
							{@const pct = totalCategorySales > 0 ? Math.round((category.quantity / totalCategorySales) * 100) : 0}
							<div class="space-y-2">
								<div class="flex-between text-sm">
									<span class="font-medium">{category.name}</span>
									<span class="text-muted-foreground">{category.quantity} ({pct}%)</span>
								</div>
								<div class="h-2 rounded-full bg-muted overflow-hidden">
									<div class="h-full rounded-full bg-primary transition-all duration-500" style="width: {pct}%"></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</section>

	<section class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader class="flex flex-row flex-between">
				<CardTitle class="flex-center gap-2">
					<Star class="icon-md text-muted-foreground" />
					{t("dashboard.bestSellers")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.bestSellers.length === 0}
					<div class="flex h-64 items-center justify-center text-muted-foreground">
						<div class="flex flex-col items-center gap-2">
							<Star class="h-12 w-12 opacity-30" />
							<p class="text-sm">{t("common.noResults")}</p>
						</div>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.analytics.bestSellers as product, i (product.id)}
							<div class="flex-between rounded-lg p-2 transition-colors hover:bg-muted/50">
								<div class="flex-center gap-3">
									<span class="flex h-7 w-7 shrink-0 flex-center justify-center rounded-full border text-xs font-semibold {i === 0 ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'}">
										{i + 1}
									</span>
									<span class="font-medium">{product.name}</span>
								</div>
								<span class="text-sm text-muted-foreground whitespace-nowrap">
									{product.quantity} {t("dashboard.unitsSold")}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>{t("dashboard.quickActions")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid gap-3 sm:grid-cols-2">
					<Button onclick={() => (showNewSaleDialog = true)} class="h-auto py-4 flex-col gap-2 press-effect">
						<div class="rounded-lg bg-primary-foreground/20 p-2"><Plus class="h-5 w-5" /></div>
						<span>{t("orders.newSale")}</span>
					</Button>
					<Button href="/admin/products" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2"><Package class="h-5 w-5" /></div>
						<span>{t("nav.products")}</span>
					</Button>
					<Button href="/admin/orders" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2"><ShoppingCart class="h-5 w-5" /></div>
						<span>{t("nav.orders")}</span>
					</Button>
					<Button href="/admin/registers" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2"><DollarSign class="h-5 w-5" /></div>
						<span>{t("nav.registers")}</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	</section>

	<section>
		<RecentOrders orders={data.recentOrders} />
	</section>
</div>

<NewSaleDialog
	bind:open={showNewSaleDialog}
	products={data.products}
	categories={data.categories}
	activeSession={data.activeSession}
	user={data.user}
/>
