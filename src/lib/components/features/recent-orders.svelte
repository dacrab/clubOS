<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { OrderDetailsDialog } from "$lib/components/features";
	import { Eye } from "@lucide/svelte";
	import type { OrderView } from "$lib/types/database";

	type Props = { orders: OrderView[]; title?: string };

	let { orders, title }: Props = $props();
	let selectedOrder = $state<OrderView | null>(null);
	let showDialog = $state(false);
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

<OrderDetailsDialog bind:open={showDialog} order={selectedOrder} />
