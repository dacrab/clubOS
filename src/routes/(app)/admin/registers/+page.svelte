<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
	} from "$lib/components/ui/dialog";
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell,
	} from "$lib/components/ui/table";
	import { Separator } from "$lib/components/ui/separator";
	import { DollarSign, Eye, Gift, ChevronDown, ChevronUp } from "@lucide/svelte";

	const { data } = $props();

	type OrderItem = {
		id: string;
		quantity: number;
		unit_price: number;
		line_total: number;
		is_treat: boolean;
		is_deleted: boolean;
		products: { id: string; name: string } | null;
	};

	type Order = {
		id: string;
		session_id: string;
		created_at: string;
		subtotal: number;
		discount_amount: number;
		total_amount: number;
		coupon_count: number;
		order_items: OrderItem[];
	};

	let selectedOrder = $state<Order | null>(null);
	let showOrderDialog = $state(false);
	let expandedSession = $state<string | null>(null);

	function getSessionOrders(sessionId: string): Order[] {
		return data.orders.filter((o: Order) => o.session_id === sessionId);
	}

	function viewOrder(order: Order) {
		selectedOrder = order;
		showOrderDialog = true;
	}

	function toggleSession(sessionId: string) {
		expandedSession = expandedSession === sessionId ? null : sessionId;
	}

	function getActiveItems(items: OrderItem[]): OrderItem[] {
		return items?.filter(item => !item.is_deleted) ?? [];
	}
</script>

<div class="space-y-6">
	<PageHeader title={t("register.title")} description={t("register.subtitle")} />

	{#if data.sessions.length === 0}
		<Card>
			<CardContent class="pt-6">
				<EmptyState
					title={t("register.empty.title")}
					description={t("register.empty.description")}
					icon={DollarSign}
				/>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each data.sessions as session (session.id)}
				{@const closing = data.closings.find((c: { session_id: string }) => c.session_id === session.id)}
				{@const sessionOrders = getSessionOrders(session.id)}
				{@const isExpanded = expandedSession === session.id}
				<Card>
					<CardHeader class="pb-3">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<CardTitle class="text-base flex items-center gap-2">
									{fmtDate(session.opened_at)}
									{#if session.closed_at}
										<Badge variant="secondary">{t("common.close")}</Badge>
									{:else}
										<Badge variant="success">{t("common.open")}</Badge>
									{/if}
								</CardTitle>
								<p class="text-sm text-muted-foreground">
									{closing?.orders_count ?? sessionOrders.length} {t("orders.title").toLowerCase()} · {fmtCurrency(closing?.orders_total ?? sessionOrders.reduce((sum: number, o: Order) => sum + o.total_amount, 0))}
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => toggleSession(session.id)}
								disabled={sessionOrders.length === 0}
							>
								{#if isExpanded}
									<ChevronUp class="h-4 w-4 mr-1" />
								{:else}
									<ChevronDown class="h-4 w-4 mr-1" />
								{/if}
								{t("orders.viewItems")}
							</Button>
						</div>
					</CardHeader>

					{#if isExpanded && sessionOrders.length > 0}
						<CardContent class="pt-0">
							<div class="rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>{t("orders.orderNumber")}</TableHead>
											<TableHead>{t("date.today")}</TableHead>
											<TableHead>{t("orders.items")}</TableHead>
											<TableHead>{t("orders.total")}</TableHead>
											<TableHead class="w-16"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{#each sessionOrders as order (order.id)}
											{@const activeItems = getActiveItems(order.order_items)}
											<TableRow class="cursor-pointer hover:bg-muted/50" onclick={() => viewOrder(order)}>
												<TableCell class="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
												<TableCell class="text-sm">{fmtDate(order.created_at)}</TableCell>
												<TableCell>
													<Badge variant="outline">
														{activeItems.length} {t("orders.itemsCount")}
													</Badge>
												</TableCell>
												<TableCell class="font-medium">{fmtCurrency(order.total_amount)}</TableCell>
												<TableCell>
													<Button variant="ghost" size="icon-sm" onclick={(e: MouseEvent) => { e.stopPropagation(); viewOrder(order); }}>
														<Eye class="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										{/each}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Order Details Dialog -->
<Dialog bind:open={showOrderDialog}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>
				{t("orders.orderDetails")} #{selectedOrder?.id.slice(0, 8)}
			</DialogTitle>
		</DialogHeader>

		{#if selectedOrder}
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">
					{fmtDate(selectedOrder.created_at)}
				</div>

				<div class="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("orders.product")}</TableHead>
								<TableHead class="text-center">{t("orders.quantity")}</TableHead>
								<TableHead class="text-right">{t("orders.unitPrice")}</TableHead>
								<TableHead class="text-right">{t("orders.lineTotal")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each getActiveItems(selectedOrder.order_items) as item (item.id)}
								<TableRow>
									<TableCell>
										<div class="flex items-center gap-2">
											{item.products?.name ?? "Unknown"}
											{#if item.is_treat}
												<Badge variant="secondary" class="text-xs">
													<Gift class="h-3 w-3 mr-1" />
													{t("orders.treat")}
												</Badge>
											{/if}
										</div>
									</TableCell>
									<TableCell class="text-center">{item.quantity}</TableCell>
									<TableCell class="text-right">{fmtCurrency(item.unit_price)}</TableCell>
									<TableCell class="text-right">
										{#if item.is_treat}
											<span class="text-muted-foreground">-</span>
										{:else}
											{fmtCurrency(item.line_total)}
										{/if}
									</TableCell>
								</TableRow>
							{:else}
								<TableRow>
									<TableCell colspan={4} class="text-center text-muted-foreground py-8">
										{t("orders.noItems")}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>

				<Separator />
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span>{t("orders.subtotal")}</span>
						<span>{fmtCurrency(selectedOrder.subtotal)}</span>
					</div>
					{#if selectedOrder.discount_amount > 0}
						<div class="flex justify-between text-muted-foreground">
							<span>{t("orders.discount")}</span>
							<span>-{fmtCurrency(selectedOrder.discount_amount)}</span>
						</div>
					{/if}
					<Separator />
					<div class="flex justify-between text-lg font-bold">
						<span>{t("orders.total")}</span>
						<span>{fmtCurrency(selectedOrder.total_amount)}</span>
					</div>
				</div>
			</div>
		{/if}
	</DialogContent>
</Dialog>
