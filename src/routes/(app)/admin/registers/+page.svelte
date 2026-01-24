<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { PageHeader, EmptyState } from "$lib/components/layout";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import { OrderDetailsDialog } from "$lib/components/features";
	import { DollarSign, Eye, ChevronDown, ChevronUp } from "@lucide/svelte";
	import { type OrderView, getActiveOrderItems } from "$lib/types/database";

	const { data } = $props();

	let selectedOrder = $state<OrderView | null>(null);
	let showDialog = $state(false);
	let expandedSession = $state<string | null>(null);

	const getSessionOrders = (sid: string) => data.orders.filter((o: OrderView) => o.session_id === sid);
</script>

<div class="space-y-6">
	<PageHeader title={t("register.title")} description={t("register.subtitle")} />

	{#if data.sessions.length === 0}
		<Card><CardContent class="pt-6"><EmptyState title={t("register.empty.title")} description={t("register.empty.description")} icon={DollarSign} /></CardContent></Card>
	{:else}
		<div class="space-y-4">
			{#each data.sessions as session (session.id)}
				{@const orders = getSessionOrders(session.id)}
				{@const sessionTotal = orders.reduce((s: number, o: OrderView) => s + o.total_amount, 0)}
				{@const expanded = expandedSession === session.id}
				<Card>
					<CardHeader class="pb-3">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<CardTitle class="text-base flex items-center gap-2">
									{fmtDate(session.opened_at)}
									<Badge variant={session.closed_at ? "secondary" : "success"}>{t(session.closed_at ? "common.close" : "common.open")}</Badge>
								</CardTitle>
								<p class="text-sm text-muted-foreground">{orders.length} {t("orders.title").toLowerCase()} · {fmtCurrency(sessionTotal)}</p>
							</div>
							<Button variant="ghost" size="sm" onclick={() => expandedSession = expanded ? null : session.id} disabled={orders.length === 0}>
								{#if expanded}<ChevronUp class="h-4 w-4 mr-1" />{:else}<ChevronDown class="h-4 w-4 mr-1" />{/if}{t("orders.viewItems")}
							</Button>
						</div>
					</CardHeader>
					{#if expanded && orders.length > 0}
						<CardContent class="pt-0">
							<div class="rounded-lg border"><Table>
								<TableHeader><TableRow><TableHead>{t("orders.orderNumber")}</TableHead><TableHead>{t("date.today")}</TableHead><TableHead>{t("orders.items")}</TableHead><TableHead>{t("orders.total")}</TableHead><TableHead class="w-16"></TableHead></TableRow></TableHeader>
								<TableBody>
									{#each orders as order (order.id)}
										<TableRow class="cursor-pointer hover:bg-muted/50" onclick={() => { selectedOrder = order; showDialog = true; }}>
											<TableCell class="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
											<TableCell class="text-sm">{fmtDate(order.created_at)}</TableCell>
											<TableCell><Badge variant="outline">{getActiveOrderItems(order.order_items).length} {t("orders.itemsCount")}</Badge></TableCell>
											<TableCell class="font-medium">{fmtCurrency(order.total_amount)}</TableCell>
											<TableCell><Button variant="ghost" size="icon-sm" onclick={(e: MouseEvent) => { e.stopPropagation(); selectedOrder = order; showDialog = true; }} aria-label={t("common.view")}><Eye class="h-4 w-4" /></Button></TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table></div>
						</CardContent>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>

<OrderDetailsDialog bind:open={showDialog} order={selectedOrder} />
