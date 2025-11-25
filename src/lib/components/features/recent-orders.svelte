<script lang="ts">
import { Eye, Printer, ShoppingCart } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import { facilityState } from "$lib/state/facility.svelte";
import { t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatDateTime, openPrintWindow } from "$lib/utils/utils";

// Types & Setup same as before...
type OrderItem = {
	id: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	product: {
		id: string;
		name: string;
		price: number;
	};
};

type OrderDetails = {
	id: string;
	total_amount: number;
	subtotal: number;
	discount_amount: number;
	coupon_count: number;
	created_at: string;
	items: OrderItem[];
};

type RawOrder = {
	id: string;
	total_amount: number;
	subtotal: number;
	discount_amount: number;
	coupon_count: number;
	created_at: string;
	order_items?: Array<{
		id: string;
		quantity: number;
		unit_price: number;
		line_total: number;
		is_treat: boolean;
		products:
			| { id: string; name: string; price: number }
			| { id: string; name: string; price: number }[];
	}>;
};

const ORDER_ID_PREFIX_LEN = 8;
const { limit = 5 } = $props<{ limit?: number }>();
let orders: OrderDetails[] = $state([]);

function formatMoney(v: number): string {
	return `€${Number(v).toFixed(2)}`;
}

// ... renderReceipt, printReceipt, loadOrders logic remains mostly same but simplified styling
function renderReceipt(order: OrderDetails): string {
	const lines = order.items
		.map(
			(item) => `
    <tr>
      <td>${item.product.name}${item.is_treat ? ' <span class="muted">(free)</span>' : ""}</td>
      <td style="text-align:right">${formatMoney(item.line_total)}</td>
    </tr>
  `,
		)
		.join("");

	return `
    <h1>clubOS ${t("common.receipt")}</h1>
    <div class="muted">#${order.id.slice(0, ORDER_ID_PREFIX_LEN)} — ${formatDateTime(order.created_at)}</div>
    <hr />
    <table>${lines}</table>
    <hr />
    <table>
      <tr><td class="muted">${t("orders.subtotal")}</td><td style="text-align:right" class="muted">${formatMoney(order.subtotal)}</td></tr>
      ${order.discount_amount > 0 ? `<tr><td class="muted">${t("orders.discount")}</td><td style="text-align:right" class="muted">- ${formatMoney(order.discount_amount)}</td></tr>` : ""}
      <tr><td class="total">${t("orders.total")}</td><td style="text-align:right" class="total">${formatMoney(order.total_amount)}</td></tr>
    </table>
  `;
}

function printReceipt(order: OrderDetails): void {
	const html = renderReceipt(order);
	openPrintWindow(html);
}

async function loadOrders(): Promise<void> {
	try {
		const { data: sessionData } = await supabase.auth.getUser();
		const userId = sessionData.user?.id ?? "";
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", userId);
		const tenantId = memberships?.[0]?.tenant_id;
		const facilityId = await facilityState.resolveSelected();

		let base = supabase
			.from("orders")
			.select(
				`
        id,
        total_amount,
        subtotal,
        discount_amount,
        coupon_count,
        created_at,
        order_items (
          id,
          quantity,
          unit_price,
          line_total,
          is_treat,
          products (
            id,
            name,
            price
          )
        )
      `,
			)
			.order("created_at", { ascending: false });
		if (tenantId) base = base.eq("tenant_id", tenantId);
		const query = facilityId ? base.eq("facility_id", facilityId) : base;
		const { data } = await query.limit(limit);

		const rawOrders = (data ?? []) as RawOrder[];

		orders = rawOrders.map((order) => ({
			id: order.id,
			total_amount: order.total_amount,
			subtotal: order.subtotal,
			discount_amount: order.discount_amount,
			coupon_count: order.coupon_count,
			created_at: order.created_at,
			items:
				order.order_items?.map((item) => ({
					id: item.id,
					quantity: item.quantity,
					unit_price: item.unit_price,
					line_total: item.line_total,
					is_treat: item.is_treat,
					product: (Array.isArray(item.products) ? item.products[0] : item.products) ?? {
						id: item.id,
						name: "Unknown",
						price: 0,
					},
				})) ?? [],
		}));
	} catch (_error) {
		orders = [];
	}
}

$effect(() => {
	loadOrders();
});
</script>

{#if orders.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
    <ShoppingCart class="size-12 opacity-20 mb-4" />
    <h3 class="text-lg font-medium text-foreground">{t("orders.none")}</h3>
    <p class="text-sm">{t("orders.latest")}</p>
  </div>
{:else}
  <div class="space-y-4">
    {#each orders as order}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
            <span class="font-semibold">{formatMoney(order.total_amount)}</span>
          </div>
          <div class="text-xs text-muted-foreground">
            {formatDateTime(order.created_at)} • {order.items.length} items
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon">
              <Eye class="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-[320px]">
            <div class="p-4 space-y-4">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="font-semibold">Order Details</span>
                <span class="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
              </div>
              <div class="space-y-2">
                {#each order.items as item}
                  <div class="flex justify-between text-sm">
                    <span>{item.product.name} <span class="text-muted-foreground">x{item.quantity}</span></span>
                    <span>{formatMoney(item.line_total)}</span>
                  </div>
                {/each}
              </div>
              <div class="border-t pt-2 space-y-1 text-sm">
                <div class="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {#if order.discount_amount > 0}
                  <div class="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span>-{formatMoney(order.discount_amount)}</span>
                  </div>
                {/if}
                <div class="flex justify-between font-bold pt-1">
                  <span>Total</span>
                  <span>{formatMoney(order.total_amount)}</span>
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <Button variant="outline" size="sm" class="w-full" onclick={() => printReceipt(order)}>
                  <Printer class="size-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/each}
  </div>
{/if}
