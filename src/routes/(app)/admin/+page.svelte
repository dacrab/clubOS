<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtCurrency, currentCurrencySymbol } from "$lib/utils/format";
	import { PageHeader } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { NewSaleDialog, RecentOrders } from "$lib/components/features";
	import { DollarSign, ShoppingCart, Package, TrendingUp, Plus, BarChart3, Star } from "@lucide/svelte";
	import { Chart, Svg, Axis, Bars, Tooltip } from "layerchart";
	import { scaleBand } from "d3-scale";

	const { data } = $props();

	let showNewSaleDialog = $state(false);

	const maxRevenue = $derived(Math.max(...data.analytics.revenueByDay.map(d => d.revenue), 1));
</script>

<div class="space-y-6">
	<PageHeader title={t("dashboard.title")} description={t("dashboard.overview")} />

	<!-- Stats Cards -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.todayRevenue")}</CardTitle>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{fmtCurrency(data.stats.todayRevenue)}</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.totalOrders")}</CardTitle>
				<ShoppingCart class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.todayOrders}</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.lowStock")}</CardTitle>
				<Package class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.lowStockCount}</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">{t("dashboard.activeUsers")}</CardTitle>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.activeUsers}</div>
			</CardContent>
		</Card>
	</div>

	<!-- Revenue Chart & Best Sellers -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Weekly Revenue Chart -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<BarChart3 class="h-5 w-5" />
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
					<div class="flex h-64 items-center justify-center text-muted-foreground">
						{t("common.noResults")}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Best Sellers -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Star class="h-5 w-5" />
					{t("dashboard.bestSellers")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.bestSellers.length === 0}
					<p class="text-sm text-muted-foreground">{t("common.noResults")}</p>
				{:else}
					<div class="space-y-3">
						{#each data.analytics.bestSellers as product, i (product.id)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<Badge variant={i === 0 ? "default" : "outline"} class="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
										{i + 1}
									</Badge>
									<span class="font-medium">{product.name}</span>
								</div>
								<span class="text-sm text-muted-foreground">
									{product.quantity} {t("dashboard.unitsSold")}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Sales by Category & Quick Actions -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Sales by Category -->
		<Card>
			<CardHeader>
				<CardTitle>{t("dashboard.salesByCategory")}</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.analytics.categorySales.length === 0}
					<p class="text-sm text-muted-foreground">{t("common.noResults")}</p>
				{:else}
					<div class="space-y-3">
						{#each data.analytics.categorySales as category (category.name)}
							{@const percentage = Math.round((category.quantity / data.analytics.categorySales.reduce((sum, c) => sum + c.quantity, 0)) * 100)}
							<div class="space-y-1">
								<div class="flex items-center justify-between text-sm">
									<span>{category.name}</span>
									<span class="text-muted-foreground">{category.quantity} ({percentage}%)</span>
								</div>
								<div class="h-2 rounded-full bg-muted overflow-hidden">
									<div
										class="h-full rounded-full bg-primary transition-all"
										style="width: {percentage}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Quick Actions -->
		<Card>
			<CardHeader>
				<CardTitle>{t("dashboard.quickActions")}</CardTitle>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-2">
				<Button onclick={() => (showNewSaleDialog = true)}>
					<Plus class="mr-2 h-4 w-4" />
					{t("orders.newSale")}
				</Button>
				<Button href="/admin/products" variant="outline">
					<Package class="mr-2 h-4 w-4" />
					{t("nav.products")}
				</Button>
				<Button href="/admin/orders" variant="outline">
					<ShoppingCart class="mr-2 h-4 w-4" />
					{t("nav.orders")}
				</Button>
			</CardContent>
		</Card>
	</div>

	<!-- Recent Orders -->
	<RecentOrders orders={data.recentOrders} />
</div>

<!-- New Sale Dialog -->
<NewSaleDialog
	bind:open={showNewSaleDialog}
	products={data.products}
	categories={data.categories}
	activeSession={data.activeSession}
	user={data.user}
/>
