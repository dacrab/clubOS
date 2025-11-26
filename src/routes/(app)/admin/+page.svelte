<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtCurrency, currentCurrencySymbol } from "$lib/utils/format";
	import { PageHeader } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { NewSaleDialog, RecentOrders } from "$lib/components/features";
	import { DollarSign, ShoppingCart, Package, TrendingUp, Plus, BarChart3, Star, Layers } from "@lucide/svelte";
	import { Chart, Svg, Axis, Bars, Tooltip } from "layerchart";
	import { scaleBand } from "d3-scale";

	const { data } = $props();

	let showNewSaleDialog = $state(false);

	const maxRevenue = $derived(Math.max(...data.analytics.revenueByDay.map(d => d.revenue), 1));
	const totalCategorySales = $derived(data.analytics.categorySales.reduce((sum, c) => sum + c.quantity, 0));
</script>

<div class="space-y-6 animate-fade-in">
	<PageHeader title={t("dashboard.title")} description={t("dashboard.overview")}>
		{#snippet actions()}
			<Button onclick={() => (showNewSaleDialog = true)} class="press-effect">
				<Plus class="mr-2 h-4 w-4" />
				{t("orders.newSale")}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats Cards -->
	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
		<Card class="hover-lift">
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.todayRevenue")}</CardTitle>
				<div class="rounded-lg bg-primary/10 p-2">
					<DollarSign class="h-4 w-4 text-primary" />
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{fmtCurrency(data.stats.todayRevenue)}</p>
			</CardContent>
		</Card>

		<Card class="hover-lift">
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.totalOrders")}</CardTitle>
				<div class="rounded-lg bg-blue-500/10 p-2">
					<ShoppingCart class="h-4 w-4 text-blue-500" />
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{data.stats.todayOrders}</p>
			</CardContent>
		</Card>

		<Card class="hover-lift">
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.lowStock")}</CardTitle>
				<div class="rounded-lg bg-amber-500/10 p-2">
					<Package class="h-4 w-4 text-amber-500" />
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{data.stats.lowStockCount}</p>
			</CardContent>
		</Card>

		<Card class="hover-lift">
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.activeUsers")}</CardTitle>
				<div class="rounded-lg bg-emerald-500/10 p-2">
					<TrendingUp class="h-4 w-4 text-emerald-500" />
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{data.stats.activeUsers}</p>
			</CardContent>
		</Card>
	</section>

	<!-- Charts Row -->
	<section class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<BarChart3 class="h-5 w-5 text-muted-foreground" />
					{t("dashboard.weeklyRevenue")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.revenueByDay.some(d => d.revenue > 0)}
					<div class="h-64">
						<Chart
							data={data.analytics.revenueByDay}
							x="date"
							xScale={scaleBand().padding(0.4)}
							y="revenue"
							yDomain={[0, maxRevenue * 1.1]}
							yNice
							padding={{ left: 48, bottom: 24, right: 8, top: 8 }}
							tooltip={{ mode: "band" }}
						>
							<Svg>
								<Axis placement="left" grid rule format={(v) => `${currentCurrencySymbol()}${v}`} />
								<Axis placement="bottom" rule />
								<Bars radius={4} strokeWidth={0} class="fill-primary" />
							</Svg>
							<Tooltip.Root let:data>
								<Tooltip.Header>{data.date}</Tooltip.Header>
								<Tooltip.List>
									<Tooltip.Item label="Revenue" value={fmtCurrency(data.revenue)} />
								</Tooltip.List>
							</Tooltip.Root>
						</Chart>
					</div>
				{:else}
					<div class="flex h-64 flex-col items-center justify-center text-muted-foreground">
						<BarChart3 class="h-12 w-12 opacity-30 mb-2" />
						<p class="text-sm">{t("common.noResults")}</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<Layers class="h-5 w-5 text-muted-foreground" />
					{t("dashboard.salesByCategory")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.categorySales.length === 0}
					<div class="flex h-64 flex-col items-center justify-center text-muted-foreground">
						<Layers class="h-12 w-12 opacity-30 mb-2" />
						<p class="text-sm">{t("common.noResults")}</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.analytics.categorySales as category (category.name)}
							{@const percentage = totalCategorySales > 0 ? Math.round((category.quantity / totalCategorySales) * 100) : 0}
							<div class="space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span class="font-medium">{category.name}</span>
									<span class="text-muted-foreground">{category.quantity} ({percentage}%)</span>
								</div>
								<div class="h-2 rounded-full bg-muted overflow-hidden">
									<div
										class="h-full rounded-full bg-primary transition-all duration-500"
										style="width: {percentage}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</section>

	<!-- Best Sellers & Quick Actions -->
	<section class="grid gap-6 lg:grid-cols-2">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between">
				<CardTitle class="flex items-center gap-2">
					<Star class="h-5 w-5 text-muted-foreground" />
					{t("dashboard.bestSellers")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.bestSellers.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
						<Star class="h-12 w-12 opacity-30 mb-2" />
						<p class="text-sm">{t("common.noResults")}</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.analytics.bestSellers as product, i (product.id)}
							<div class="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50">
								<div class="flex items-center gap-3">
									<Badge
										variant={i === 0 ? "default" : "outline"}
										class="w-7 h-7 rounded-full p-0 flex items-center justify-center text-xs font-semibold shrink-0"
									>
										{i + 1}
									</Badge>
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
						<div class="rounded-lg bg-primary-foreground/20 p-2">
							<Plus class="h-5 w-5" />
						</div>
						<span>{t("orders.newSale")}</span>
					</Button>
					<Button href="/admin/products" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2">
							<Package class="h-5 w-5" />
						</div>
						<span>{t("nav.products")}</span>
					</Button>
					<Button href="/admin/orders" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2">
							<ShoppingCart class="h-5 w-5" />
						</div>
						<span>{t("nav.orders")}</span>
					</Button>
					<Button href="/admin/registers" variant="outline" class="h-auto py-4 flex-col gap-2 hover-lift">
						<div class="rounded-lg bg-muted p-2">
							<DollarSign class="h-5 w-5" />
						</div>
						<span>{t("nav.registers")}</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	</section>

	<!-- Recent Orders -->
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
