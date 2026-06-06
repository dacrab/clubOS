<script lang="ts">
import { Eye, ShoppingCart } from "@lucide/svelte";
import OrderDetailsDialog from "$lib/components/features/order-details-dialog.svelte";
import EmptyState from "$lib/components/layout/empty-state.svelte";
import PageHeader from "$lib/components/layout/page-header.svelte";
import Badge from "$lib/components/ui/badge/badge.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card, { CardContent } from "$lib/components/ui/card/card.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Pagination from "$lib/components/ui/pagination/pagination.svelte";
import Table, {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table/table.svelte";
import { t } from "$lib/i18n/index.svelte";
import type { OrderView } from "$lib/types/database";
import { fmtCurrency, fmtDate } from "$lib/utils/format";
import { getActiveOrderItems, shortId } from "$lib/utils/helpers";

const { data } = $props();

let selectedOrder = $state<OrderView | null>(null);
let showDialog = $state(false);
</script>

<div class="space-y-6">
	<PageHeader title={t("orders.title")} description={t("orders.subtitle")} />

	<form method="GET" class="max-w-sm">
		<Input name="search" placeholder={t("orders.searchById")} value={data.search} />
	</form>

	{#if data.orders.length === 0}
		<Card><CardContent class="pt-6"><EmptyState title={t("orders.empty.title")} description={t("orders.empty.description")} icon={ShoppingCart} /></CardContent></Card>
	{:else}
		<Card><Table>
			<TableHeader><TableRow>
				<TableHead>{t("orders.orderNumber")}</TableHead><TableHead>{t("date.date")}</TableHead><TableHead>{t("orders.items")}</TableHead>
				<TableHead>{t("orders.subtotal")}</TableHead><TableHead>{t("orders.discount")}</TableHead><TableHead>{t("orders.total")}</TableHead><TableHead class="w-20">{t("common.actions")}</TableHead>
			</TableRow></TableHeader>
			<TableBody>
				{#each data.orders as order (order.id)}
					<TableRow class="cursor-pointer hover:bg-muted/50" onclick={() => { selectedOrder = order; showDialog = true; }}>
						<TableCell class="font-mono text-sm">{shortId(order.id)}</TableCell>
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
		<Pagination page={data.page} totalPages={data.totalPages} />
	{/if}
</div>

<OrderDetailsDialog bind:open={showDialog} order={selectedOrder} />
