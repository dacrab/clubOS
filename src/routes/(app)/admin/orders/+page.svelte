<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Card, CardContent } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { OrderDetailsDialog } from "$lib/components/features";
	import { ShoppingCart, Eye } from "@lucide/svelte";
	import { type OrderView, getActiveOrderItems } from "$lib/types/database";

	const { data } = $props();

	let selectedOrder = $state<OrderView | null>(null);
	let showDialog = $state(false);
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
						<TableCell><Badge variant="outline">{getActiveOrderItems(order.order_items).length} {t("orders.itemsCount")}</Badge></TableCell>
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

<OrderDetailsDialog bind:open={showDialog} order={selectedOrder} />
