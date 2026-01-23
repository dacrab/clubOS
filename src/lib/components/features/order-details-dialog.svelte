<script lang="ts">
	import { t } from "$lib/i18n/index.svelte";
	import { fmtDate, fmtCurrency } from "$lib/utils/format";
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
	import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "$lib/components/ui/table";
	import Separator from "$lib/components/ui/separator/separator.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Gift } from "@lucide/svelte";
	import { type OrderView, getActiveOrderItems, getProductName } from "$lib/types/database";

	type Props = {
		open: boolean;
		order: OrderView | null;
	};

	let { open = $bindable(), order }: Props = $props();
</script>

<Dialog bind:open>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>{t("orders.orderDetails")} #{order?.id.slice(0, 8)}</DialogTitle>
		</DialogHeader>
		{#if order}
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">{fmtDate(order.created_at)}</div>
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
							{#each getActiveOrderItems(order.order_items) as item (item.id)}
								<TableRow>
									<TableCell>
										<div class="flex items-center gap-2">
											{getProductName(item.products)}
											{#if item.is_treat}
												<Badge variant="secondary" class="text-xs">
													<Gift class="h-3 w-3 mr-1" />{t("orders.treat")}
												</Badge>
											{/if}
										</div>
									</TableCell>
									<TableCell class="text-center">{item.quantity}</TableCell>
									<TableCell class="text-right">{fmtCurrency(item.unit_price)}</TableCell>
									<TableCell class="text-right">{item.is_treat ? "-" : fmtCurrency(item.line_total)}</TableCell>
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
						<span>{fmtCurrency(order.subtotal)}</span>
					</div>
					{#if order.discount_amount > 0}
						<div class="flex justify-between text-muted-foreground">
							<span>{t("orders.discount")} ({order.coupon_count} {t("orders.coupons").toLowerCase()})</span>
							<span>-{fmtCurrency(order.discount_amount)}</span>
						</div>
					{/if}
					<Separator />
					<div class="flex justify-between text-lg font-bold">
						<span>{t("orders.total")}</span>
						<span>{fmtCurrency(order.total_amount)}</span>
					</div>
				</div>
			</div>
		{/if}
	</DialogContent>
</Dialog>
