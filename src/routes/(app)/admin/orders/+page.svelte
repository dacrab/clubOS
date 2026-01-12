<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Card, CardContent } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { Separator } from "$lib/components/ui/separator";
	import { ShoppingCart, Eye, Gift } from "@lucide/svelte";

	const { data } = $props();

	type OrderItem = { id: string; quantity: number; unit_price: number; line_total: number; is_treat: boolean; is_deleted: boolean; products: { id: string; name: string } | null };
	type Order = { id: string; created_at: string; subtotal: number; discount_amount: number; total_amount: number; coupon_count: number; order_items: OrderItem[] };

	let selectedOrder = $state<Order | null>(null);
	let showDialog = $state(false);

	const getActiveItems = (items: OrderItem[]) => items?.filter(i => !i.is_deleted) ?? [];
</script>

<div class="space-y-6">
	<PageHeader title={t("orders.title")} description={t("orders.subtitle")} />

	{#if data.orders.length === 0}
		<Card><CardContent class="pt-6"><EmptyState title={t("orders.empty.title")} description={t("orders.empty.description")} icon={ShoppingCart} /></CardContent></Card>
	{:else}
		<Card><Table>
			<TableHeader><TableRow>
				<TableHead>{t("orders.orderNumber")}</TableHead><TableHead>{t("date.today")}</TableHead><TableHead>{t("orders.items")}</TableHead>
				<TableHead>{t("orders.subtotal")}</TableHead><TableHead>{t("orders.discount")}</TableHead><TableHead>{t("orders.total")}</TableHead><TableHead class="w-20">{t("common.actions")}</TableHead>
			</TableRow></TableHeader>
			<TableBody>
				{#each data.orders as order (order.id)}
					<TableRow class="cursor-pointer hover:bg-muted/50" onclick={() => { selectedOrder = order; showDialog = true; }}>
						<TableCell class="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
						<TableCell>{fmtDate(order.created_at)}</TableCell>
						<TableCell><Badge variant="outline">{getActiveItems(order.order_items).length} {t("orders.itemsCount")}</Badge></TableCell>
						<TableCell>{fmtCurrency(order.subtotal)}</TableCell>
						<TableCell>{#if order.discount_amount > 0}<Badge variant="secondary">-{fmtCurrency(order.discount_amount)}</Badge>{:else}-{/if}</TableCell>
						<TableCell class="font-medium">{fmtCurrency(order.total_amount)}</TableCell>
						<TableCell><Button variant="ghost" size="icon-sm" onclick={(e: MouseEvent) => { e.stopPropagation(); selectedOrder = order; showDialog = true; }} aria-label={t("common.view")}><Eye class="h-4 w-4" /></Button></TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table></Card>
	{/if}
</div>

<Dialog bind:open={showDialog}>
	<DialogContent class="max-w-2xl">
		<DialogHeader><DialogTitle>{t("orders.orderDetails")} #{selectedOrder?.id.slice(0, 8)}</DialogTitle></DialogHeader>
		{#if selectedOrder}
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">{fmtDate(selectedOrder.created_at)}</div>
				<div class="rounded-lg border"><Table>
					<TableHeader><TableRow><TableHead>{t("orders.product")}</TableHead><TableHead class="text-center">{t("orders.quantity")}</TableHead><TableHead class="text-right">{t("orders.unitPrice")}</TableHead><TableHead class="text-right">{t("orders.lineTotal")}</TableHead></TableRow></TableHeader>
					<TableBody>
						{#each getActiveItems(selectedOrder.order_items) as item (item.id)}
							<TableRow>
								<TableCell><div class="flex items-center gap-2">{item.products?.name ?? "Unknown"}{#if item.is_treat}<Badge variant="secondary" class="text-xs"><Gift class="h-3 w-3 mr-1" />{t("orders.treat")}</Badge>{/if}</div></TableCell>
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
