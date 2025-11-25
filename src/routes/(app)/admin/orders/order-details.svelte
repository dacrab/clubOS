<script lang="ts">
import { t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatDateTime } from "$lib/utils/utils";

type OrderRow = {
	id: string;
	created_at: string;
	subtotal: number;
	discount_amount: number;
	total_amount: number;
	coupon_count: number;
};

type OrderItemRow = {
	id: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	product_name: string;
};

const { order } = $props<{ order: OrderRow }>();

let items: OrderItemRow[] = $state([]);

$effect(() => {
	// Load items when order changes
	loadItems().then(() => {
		/* no-op */
	});
});

async function loadItems() {
	const { data } = await supabase
		.from("order_items")
		.select("id, order_id, quantity, unit_price, line_total, is_treat, is_deleted, products(name)")
		.eq("order_id", order.id);

	const list: OrderItemRow[] = [];
	for (const item of data ?? []) {
		if ((item as { is_deleted?: boolean }).is_deleted) {
			continue;
		}
		const prod = (item as unknown as { products?: unknown }).products;
		const productName = Array.isArray(prod)
			? String((prod as Array<{ name?: string }>)[0]?.name ?? "")
			: String((prod as { name?: string } | null)?.name ?? "");
		list.push({
			id: String((item as { id: string }).id),
			quantity: Number((item as { quantity?: number }).quantity ?? 0),
			unit_price: Number((item as { unit_price?: number }).unit_price ?? 0),
			line_total: Number((item as { line_total?: number }).line_total ?? 0),
			is_treat: Boolean((item as { is_treat?: boolean }).is_treat ?? false),
			product_name: productName,
		});
	}
	items = list;
}

function money(value: number) {
	return `€${Number(value).toFixed(2)}`;
}

// Mark markup-only usages for Biome
((..._args: unknown[]) => {
	return;
})(t, formatDateTime, money);
</script>

<div class="flex flex-col gap-4 p-6">
  <div class="flex items-center justify-between">
    <h4 class="text-sm font-semibold text-foreground">
      {t("orders.orderLabel")} #{order.id.slice(0, 8)}
    </h4>
    <span class="text-xs text-muted-foreground">
      {formatDateTime(order.created_at)}
    </span>
  </div>

  <div
    class="grid gap-3 rounded-xl border border-outline-soft/60 bg-surface-soft/80 p-4 text-xs font-medium text-muted-foreground sm:grid-cols-3"
  >
    <div class="flex flex-col gap-1">
      <span>{t("orders.itemsHeader")}</span>
      <span class="text-base font-semibold text-foreground">{items.length}</span
      >
    </div>
    <div class="flex flex-col gap-1">
      <span>{t("orders.coupons")}</span>
      <span class="text-base font-semibold text-foreground"
        >{order.coupon_count}</span
      >
    </div>
    <div class="flex flex-col gap-1">
      <span>{t("orders.treatsWord")}</span>
      <span class="text-base font-semibold text-foreground"
        >{items.filter((i) => i.is_treat).length}</span
      >
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <h5
      class="text-xs font-semibold uppercase text-muted-foreground"
    >
      {t("orders.itemsHeader")}
    </h5>
    {#each items as item (item.id)}
      <div
        class="flex items-center justify-between gap-4 rounded-xl border border-outline-soft/60 bg-surface px-3 py-3 text-sm"
      >
        <div class="flex items-center gap-2 text-foreground">
          <span class="font-medium">{item.product_name}</span>
          <span class="text-xs text-muted-foreground">×{item.quantity}</span>
          {#if item.is_treat}
            <span
              class="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300"
            >
              {t("orders.free")}
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-2 text-sm">
          {#if item.is_treat}
            <span class="text-xs text-muted-foreground line-through"
              >{money(item.unit_price)}</span
            >
            <span class="font-medium text-foreground">€0.00</span>
          {:else}
            <span class="font-medium text-foreground"
              >{money(item.line_total)}</span
            >
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-2 border-t border-outline-soft/60 pt-4 text-sm">
    <div class="flex justify-between text-muted-foreground">
      <span>{t("orders.subtotal")}</span>
      <span>{money(order.subtotal)}</span>
    </div>
    {#if order.discount_amount > 0}
      <div class="flex justify-between text-emerald-600 dark:text-emerald-300">
        <span>{t("orders.discount")}</span>
        <span>-{money(order.discount_amount)}</span>
      </div>
    {/if}
    <div class="flex justify-between text-base font-semibold">
      <span>{t("orders.total")}</span>
      <span>{money(order.total_amount)}</span>
    </div>
  </div>
</div>
