<script lang="ts">
import { Button } from "$lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import { Eye, Printer, Receipt } from "@lucide/svelte";
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatDateTime, openPrintWindow } from "$lib/utils/utils";

// Types
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

// Constants
const ORDER_ID_PREFIX_LEN = 8;

// Component setup

// Props
const __props = $props<{ limit?: number }>();
const { limit = 5 } = __props;

// State
let orders: OrderDetails[] = $state([]);

// Utility functions
function formatMoney(v: number): string {
	return `€${Number(v).toFixed(2)}`;
}

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

// Data loading
async function loadOrders(): Promise<void> {
	try {
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user.id ?? "";
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
					product: (Array.isArray(item.products)
						? item.products[0]
						: item.products) ?? {
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

// Effects
$effect(() => {
	loadOrders();
});
</script>

{#if orders.length === 0}
  <div
    class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-outline-soft bg-surface py-12 px-6 text-center"
  >
    <div
      class="grid size-16 place-items-center rounded-full bg-muted/30"
    >
      <Receipt class="size-8 text-muted-foreground/60" />
    </div>
    <div class="flex max-w-xs flex-col gap-1">
      <h3 class="text-base font-semibold text-foreground">
        {t("orders.none")}
      </h3>
      <p class="text-sm text-muted-foreground">
        {t("orders.latest")}
      </p>
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-3">
    {#each orders as order}
      <div
        class="flex items-center justify-between gap-4 rounded-2xl border border-outline-soft bg-surface px-4 py-3 transition-all hover:border-outline-strong hover:bg-surface-strong/60"
      >
        <div class="min-w-0 flex-1">
          <div
            class="flex items-center gap-3 text-sm font-semibold text-foreground"
          >
            <span class="font-mono text-[11px] uppercase text-muted-foreground">
              #{order.id.slice(0, ORDER_ID_PREFIX_LEN)}
            </span>
            <span>{formatMoney(order.total_amount)}</span>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            {formatDateTime(order.created_at)}
          </div>
          <div class="mt-2 text-xs text-muted-foreground">
            {order.items.length}
            {t("orders.itemsWord")} • {order.items.filter((i) => i.is_treat)
              .length}
            {t("orders.treatsWord")}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 rounded-full border border-outline-soft p-0"
            >
              <Eye class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="w-[24rem] rounded-2xl border border-outline-soft bg-surface-strong/80 backdrop-blur-xl"
          >
            <div class="flex flex-col gap-3 p-4">
              <!-- Order header -->
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-foreground">
                  {t("orders.orderLabel")} #{order.id.slice(
                    0,
                    ORDER_ID_PREFIX_LEN,
                  )}
                </h4>
                <span class="text-xs text-muted-foreground">
                  {formatDateTime(order.created_at)}
                </span>
              </div>

              <!-- Order stats -->
              <div
                class="grid gap-1 rounded-xl border border-outline-soft bg-surface/70 p-2 text-xs font-medium text-muted-foreground sm:grid-cols-3"
              >
                <div class="flex flex-col gap-1">
                  <span>{t("orders.itemsHeader")}</span>
                  <span class="text-base font-semibold text-foreground"
                    >{order.items.length}</span
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
                    >{order.items.filter((i) => i.is_treat).length}</span
                  >
                </div>
              </div>

              <!-- Order items -->
              <div class="flex flex-col gap-2">
                <h5
                  class="text-xs font-semibold uppercase text-muted-foreground"
                >
                  {t("orders.itemsHeader")}
                </h5>
                {#each order.items as item}
                  <div
                    class="flex items-center justify-between gap-3 rounded-xl border border-outline-soft bg-surface px-2 py-1.5 text-xs"
                  >
                    <div class="flex items-center gap-2 text-foreground">
                      <span class="font-medium">{item.product.name}</span>
                      <span class="text-xs text-muted-foreground"
                        >×{item.quantity}</span
                      >
                      {#if item.is_treat}
                        <span
                          class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300"
                        >
                          {t("orders.free")}
                        </span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2 text-xs">
                      {#if item.is_treat}
                        <span class="text-xs text-muted-foreground line-through"
                          >€{Number(item.unit_price).toFixed(2)}</span
                        >
                        <span class="font-medium text-foreground">€0.00</span>
                      {:else}
                        <span class="font-medium text-foreground"
                          >€{Number(item.line_total).toFixed(2)}</span
                        >
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Order totals -->
              <div
                class="flex flex-col gap-1.5 border-t border-outline-soft pt-3 text-xs text-foreground"
              >
                <div class="flex justify-between">
                  <span class="text-muted-foreground"
                    >{t("orders.subtotal")}</span
                  >
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {#if order.discount_amount > 0}
                  <div
                    class="flex justify-between text-emerald-600 dark:text-emerald-300"
                  >
                    <span>{t("orders.discount")}</span>
                    <span>-{formatMoney(order.discount_amount)}</span>
                  </div>
                {/if}
                <div class="flex justify-between text-sm font-semibold">
                  <span>{t("orders.total")}</span>
                  <span>{formatMoney(order.total_amount)}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-2 border-t border-outline-soft pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => printReceipt(order)}
                  class="flex-1 rounded-full border-outline-soft"
                >
                  <Printer class="mr-2 h-4 w-4" />
                  {t("common.print")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1 rounded-full border-outline-soft"
                >
                  <Receipt class="mr-2 h-4 w-4" />
                  {t("common.details")}
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/each}
  </div>
{/if}
