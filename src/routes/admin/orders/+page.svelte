<script lang="ts">
import { Eye, ReceiptText } from "@lucide/svelte";
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { DateRangePicker } from "$lib/components/ui/date-picker";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { formatDateTime } from "$lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

type OrderRow = {
  id: string;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  coupon_count: number;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_treat: boolean;
  products: { id: string; name: string; price: number };
};

let orders: OrderRow[] = $state([]);
let itemsByOrder: Record<string, OrderItem[]> = $state({});

// Date range (default: today)
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
let startDate = $state<string>(`${yyyy}-${mm}-${dd}`);
let endDate = $state<string>(`${yyyy}-${mm}-${dd}`);

$effect(() => {
  loadAll();
});

async function loadAll() {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const { data } = await supabase
    .from("orders")
    .select(
      "id, created_at, subtotal, discount_amount, total_amount, coupon_count"
    )
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });
  orders = (data as OrderRow[] | null) ?? [];

  const ids = orders.map((order) => order.id);
  if (ids.length === 0) {
    itemsByOrder = {};
    return;
  }
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, order_id, quantity, unit_price, line_total, is_treat, products(id,name,price)"
    )
    .in("order_id", ids);
  const map: Record<string, OrderItem[]> = {};
  for (const item of (items as OrderItem[] | null) ?? []) {
    const orderId = (item as unknown as { order_id: string }).order_id;
    if (!map[orderId]) map[orderId] = [];
    map[orderId].push(item);
  }
  itemsByOrder = map;
}

function money(value: number) {
  return `€${Number(value).toFixed(2)}`;
}
</script>

<PageContent>
  <PageHeader
    title={t("pages.ordersPage.title")}
    icon={ReceiptText}
    subtitle={t("orders.latest") ?? t("orders.recent")}
  />

  <Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
    <div class="border-b border-outline-soft/70 px-6 py-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("orders.recent")}
        </h2>
        <span class="text-xs text-muted-foreground">
          {t("orders.itemsHeader")} • {orders.length}
        </span>
      </div>
      <div class="mt-3 max-w-xl">
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("pages.registers.pickDate")}</div>
        <div class="mt-2">
          <DateRangePicker bind:start={startDate} bind:end={endDate} on:change={loadAll} />
        </div>
      </div>
    </div>
    <div class="overflow-x-auto">
      <Table class="min-w-full">
        <TableHeader>
          <TableRow class="border-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <TableHead class="rounded-l-2xl bg-surface-strong/60 pl-6">ID</TableHead>
            <TableHead class="bg-surface-strong/60">{t("pages.ordersPage.date")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.subtotal")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.discount")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.total")}</TableHead>
            <TableHead class="rounded-r-2xl bg-surface-strong/60 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each orders as order}
            <TableRow class="border-b border-outline-soft/40">
              <TableCell class="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                #{order.id.slice(0, 8)}
              </TableCell>
              <TableCell class="text-sm text-foreground">
                {formatDateTime(order.created_at)}
              </TableCell>
              <TableCell class="text-right text-sm font-medium">{money(order.subtotal)}</TableCell>
              <TableCell class="text-right text-sm text-emerald-600 dark:text-emerald-300">
                - {money(order.discount_amount)}
              </TableCell>
              <TableCell class="text-right text-sm font-semibold text-foreground">
                {money(order.total_amount)}
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" class="size-9 rounded-full border border-outline-soft">
                      <Eye class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="w-[30rem] rounded-3xl border border-outline-soft bg-surface-strong/80 backdrop-blur-xl">
                    <div class="flex flex-col gap-4 p-6">
                      <div class="flex items-center justify-between">
                        <h4 class="text-sm font-semibold text-foreground">
                          {t("orders.orderLabel")} #{order.id.slice(0, 8)}
                        </h4>
                        <span class="text-xs text-muted-foreground">
                          {formatDateTime(order.created_at)}
                        </span>
                      </div>

                      <div class="grid gap-2 rounded-xl border border-outline-soft bg-surface/70 p-3 text-xs font-medium text-muted-foreground sm:grid-cols-3">
                        <div class="flex flex-col gap-1">
                          <span>{t("orders.itemsHeader")}</span>
                          <span class="text-base font-semibold text-foreground">{(itemsByOrder[order.id] ?? []).length}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                          <span>{t("orders.coupons")}</span>
                          <span class="text-base font-semibold text-foreground">{order.coupon_count}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                          <span>{t("orders.treatsWord")}</span>
                          <span class="text-base font-semibold text-foreground">{(itemsByOrder[order.id] ?? []).filter((item) => item.is_treat).length}</span>
                        </div>
                      </div>

                      <div class="flex flex-col gap-2">
                        <h5 class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {t("orders.itemsHeader")}
                        </h5>
                        {#each itemsByOrder[order.id] ?? [] as item}
                          <div class="flex items-center justify-between gap-4 rounded-xl border border-outline-soft bg-surface px-3 py-2 text-sm">
                            <div class="flex items-center gap-2 text-foreground">
                              <span class="font-medium">{item.products.name}</span>
                              <span class="text-xs text-muted-foreground">×{item.quantity}</span>
                              {#if item.is_treat}
                                <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                                  {t("orders.free")}
                                </span>
                              {/if}
                            </div>
                            <div class="flex items-center gap-2 text-sm">
                              {#if item.is_treat}
                                <span class="text-xs text-muted-foreground line-through">€{Number(item.unit_price).toFixed(2)}</span>
                                <span class="font-medium text-foreground">€0.00</span>
                              {:else}
                                <span class="font-medium text-foreground">€{Number(item.line_total).toFixed(2)}</span>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>

                      <div class="flex flex-col gap-2 border-t border-outline-soft pt-4 text-sm">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>


