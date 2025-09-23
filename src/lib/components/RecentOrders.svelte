<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import { supabase } from "$lib/supabaseClient";
import { openPrintWindow, formatDateTime } from "$lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

import { Eye, Printer, Receipt } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import { t } from "$lib/i18n";

const __props = $props<{ limit?: number }>();
const { limit = 5 } = __props;

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

let orders: OrderDetails[] = $state([]);

const ORDER_ID_PREFIX_LEN = 8;

async function load() {
  const { data } = await supabase
    .from("orders")
    .select(`
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
      `)
    .order("created_at", { ascending: false })
    .limit(limit);

  orders =
    (data as any)?.map((order: any) => ({
      ...order,
      items:
        order.order_items?.map((item: any) => ({
          ...item,
          product: item.products,
        })) || [],
    })) ?? [];
}

function formatMoney(v: number) {
  return `€${Number(v).toFixed(2)}`;
}
function renderReceipt(order: OrderDetails) {
  const lines = order.items
    .map(
      (i) => `
    <tr>
      <td>${i.product.name}${i.is_treat ? ' <span class="muted">(free)</span>' : ""}</td>
      <td style="text-align:right">${formatMoney(i.line_total)}</td>
    </tr>
  `
    )
    .join("");
  return `
    <h1>clubOS ${t('orders.receiptTitle')}</h1>
    <div class="muted">#${order.id.slice(0, ORDER_ID_PREFIX_LEN)} — ${formatDateTime(order.created_at)}</div>
    <hr />
    <table>${lines}</table>
    <hr />
    <table>
      <tr><td class="muted">${t('orders.subtotal')}</td><td style="text-align:right" class="muted">${formatMoney(order.subtotal)}</td></tr>
      ${order.discount_amount > 0 ? `<tr><td class="muted">${t('orders.discount')}</td><td style="text-align:right" class="muted">- ${formatMoney(order.discount_amount)}</td></tr>` : ""}
      <tr><td class="total">${t('orders.total')}</td><td style="text-align:right" class="total">${formatMoney(order.total_amount)}</td></tr>
    </table>
  `;
}

async function printReceipt(order: OrderDetails) {
  const html = renderReceipt(order);
  openPrintWindow(html);
}

$effect(() => {
  load();
});
</script>

{#if orders.length === 0}
  <div class="text-sm text-muted-foreground">{t('orders.none')}</div>
{:else}
  <div class="space-y-3">
    {#each orders as order}
      <div class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-xs text-muted-foreground">#{order.id.slice(0,8)}</span>
            <span class="text-sm font-semibold">€{Number(order.total_amount).toFixed(2)}</span>
          </div>
          <div class="text-xs text-muted-foreground">
            {formatDateTime(order.created_at)}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {order.items.length} {t('orders.itemsWord')} • {order.items.filter(i => i.is_treat).length} {t('orders.treatsWord')}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Eye class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-96">
            <div class="p-4">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="font-semibold">{t('orders.orderLabel')} #{order.id.slice(0,8)}</h4>
                  <span class="text-sm text-muted-foreground">
                    {formatDateTime(order.created_at)}
                  </span>
                </div>

                <div class="space-y-2">
                  <h5 class="font-medium text-sm">{t('orders.itemsHeader')}</h5>
                  {#each order.items as item}
                    <div class="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{item.product.name}</span>
                        <span class="text-xs text-muted-foreground">×{item.quantity}</span>
                        {#if item.is_treat}
                          <span class="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">{t('orders.free')}</span>
                        {/if}
                      </div>
                      <div class="flex items-center gap-2">
                        {#if item.is_treat}
                          <span class="text-xs line-through text-muted-foreground">€{Number(item.unit_price).toFixed(2)}</span>
                          <span class="font-medium">€0.00</span>
                        {:else}
                          <span class="font-medium">€{Number(item.line_total).toFixed(2)}</span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="p-2 rounded bg-muted/30">
                    <div class="text-muted-foreground">{t('orders.itemsHeader')}</div>
                    <div class="font-semibold">{order.items.length}</div>
                  </div>
                  <div class="p-2 rounded bg-muted/30">
                    <div class="text-muted-foreground">{t('orders.coupons')}</div>
                    <div class="font-semibold">{order.coupon_count}</div>
                  </div>
                  <div class="p-2 rounded bg-muted/30">
                    <div class="text-muted-foreground">{t('orders.treatsWord')}</div>
                    <div class="font-semibold">{order.items.filter(i => i.is_treat).length}</div>
                  </div>
                  <div class="p-2 rounded bg-muted/30">
                    <div class="text-muted-foreground">{t('orders.discount')}</div>
                    <div class="font-semibold">€{Number(order.discount_amount).toFixed(2)}</div>
                  </div>
                </div>

                <div class="border-t pt-3 space-y-1">
                  <div class="flex justify-between text-sm">
                    <span>{t('orders.subtotal')}</span>
                    <span>€{Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  {#if order.discount_amount > 0}
                    <div class="flex justify-between text-sm text-green-600">
                      <span>{t('orders.discount')}</span>
                      <span>-€{Number(order.discount_amount).toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="flex justify-between font-semibold">
                    <span>{t('orders.total')}</span>
                    <span>€{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div class="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => printReceipt(order)}
                    class="flex-1"
                  >
                    <Printer class="h-3 w-3 mr-1" />
                    {t('orders.print')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="flex-1"
                  >
                    <Receipt class="h-3 w-3 mr-1" />
                    {t('orders.details')}
                  </Button>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/each}
  </div>
{/if}


