<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { Separator } from "$lib/components/ui/separator";
	import { Eye, Gift } from "@lucide/svelte";

	type OrderItem = { id: string; quantity: number; unit_price: number; line_total: number; is_treat: boolean; is_deleted: boolean; products: { id: string; name: string } | { id: string; name: string }[] | null };
	type Order = { id: string; created_at: string; subtotal: number; discount_amount: number; total_amount: number; coupon_count: number; order_items: OrderItem[] };
	type Props = { orders: Order[]; title?: string };

	let { orders, title }: Props = $props();
	let selectedOrder = $state<Order | null>(null);
	let showDialog = $state(false);

	const getProductName = (p: OrderItem["products"]) => Array.isArray(p) ? p[0]?.name : p?.name ?? "Unknown";
</script>

<Card>
	<CardHeader><CardTitle>{title ?? t("dashboard.recentOrders")}</CardTitle></CardHeader>
	<CardContent>
		{#if orders.length === 0}
			<p class="text-sm text-muted-foreground">{t("orders.empty.description")}</p>
		{:else}
			<div class="space-y-2">
				{#each orders as order (order.id)}
					<button type="button" class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50" onclick={() => { selectedOrder = order; showDialog = true; }}>
						<div class="flex items-center gap-3">
							<div>
								<div class="flex items-center gap-2">
									<p class="font-medium">#{order.id.slice(0, 8)}</p>
									{#if order.order_items?.length > 0}<Badge variant="outline" class="text-xs">{order.order_items.length} {t("orders.itemsCount")}</Badge>{/if}
								</div>
								<p class="text-sm text-muted-foreground">{fmtDate(order.created_at)}</p>
							</div>
						</div>
						<div class="flex items-center gap-3"><p class="font-medium">{fmtCurrency(order.total_amount)}</p><Eye class="h-4 w-4 text-muted-foreground" /></div>
					</button>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>

<Dialog bind:open={showDialog}>
	<DialogContent class="max-w-2xl">
		<DialogHeader><DialogTitle>{t("orders.orderDetails")} #{selectedOrder?.id.slice(0, 8)}</DialogTitle></DialogHeader>
		{#if selectedOrder}
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">{fmtDate(selectedOrder.created_at)}</div>
				<div class="rounded-lg border"><Table>
					<TableHeader><TableRow><TableHead>{t("orders.product")}</TableHead><TableHead class="text-center">{t("orders.quantity")}</TableHead><TableHead class="text-right">{t("orders.unitPrice")}</TableHead><TableHead class="text-right">{t("orders.lineTotal")}</TableHead></TableRow></TableHeader>
					<TableBody>
						{#each selectedOrder.order_items.filter(i => !i.is_deleted) as item (item.id)}
							<TableRow>
								<TableCell><div class="flex items-center gap-2">{getProductName(item.products)}{#if item.is_treat}<Badge variant="secondary" class="text-xs"><Gift class="h-3 w-3 mr-1" />{t("orders.treat")}</Badge>{/if}</div></TableCell>
								<TableCell class="text-center">{item.quantity}</TableCell>
								<TableCell class="text-right">{fmtCurrency(item.unit_price)}</TableCell>
								<TableCell class="text-right">{item.is_treat ? "-" : fmtCurrency(item.line_total)}</TableCell>
							</TableRow>
						{:else}<TableRow><TableCell colspan={4} class="text-center text-muted-foreground py-8">{t("orders.noItems")}</TableCell></TableRow>{/each}
					</TableBody>
				</Table></div>
				<Separator />
				<div class="space-y-2 text-sm">
					<div class="flex justify-between"><span>{t("orders.subtotal")}</span><span>{fmtCurrency(selectedOrder.subtotal)}</span></div>
					{#if selectedOrder.discount_amount > 0}<div class="flex justify-between text-muted-foreground"><span>{t("orders.discount")} ({selectedOrder.coupon_count} {t("orders.coupons").toLowerCase()})</span><span>-{fmtCurrency(selectedOrder.discount_amount)}</span></div>{/if}
					<Separator />
					<div class="flex justify-between text-lg font-bold"><span>{t("orders.total")}</span><span>{fmtCurrency(selectedOrder.total_amount)}</span></div>
				</div>
			</div>
		{/if}
	</DialogContent>
</Dialog>
