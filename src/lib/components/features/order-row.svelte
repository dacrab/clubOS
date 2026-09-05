<script lang="ts">
import { Eye } from "@lucide/svelte";
import Badge from "$lib/components/ui/badge/badge.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";
import { t } from "$lib/i18n/index.svelte";
import type { OrderView } from "$lib/types/database";
import { fmtCurrency, fmtDate } from "$lib/utils/format";
import { getActiveOrderItems, shortId } from "$lib/utils/helpers";

type Props = {
	order: OrderView;
	/** Extra cells (subtotal/discount) rendered between the items badge and total. */
	children?: import("svelte").Snippet;
	onSelect: () => void;
};

let { order, children, onSelect }: Props = $props();
</script>

<TableRow class="cursor-pointer hover:bg-muted/50" onclick={onSelect}>
	<TableCell class="font-mono text-sm">{shortId(order.id)}</TableCell>
	<TableCell class="text-sm">{fmtDate(order.createdAt)}</TableCell>
	<TableCell><Badge variant="outline">{getActiveOrderItems(order.orderItems).length} {t("orders.itemsCount")}</Badge></TableCell>
	{#if children}{@render children()}{/if}
	<TableCell class="font-medium">{fmtCurrency(order.totalAmount)}</TableCell>
	<TableCell><Button variant="ghost" size="icon-sm" onclick={(e: MouseEvent) => { e.stopPropagation(); onSelect(); }} aria-label={t("common.view")}><Eye class="h-4 w-4" /></Button></TableCell>
</TableRow>
