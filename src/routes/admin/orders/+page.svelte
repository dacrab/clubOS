<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import { supabase } from "$lib/supabaseClient";
import { t } from "$lib/i18n";
import { Card } from "$lib/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
import { Button } from "$lib/components/ui/button";
import { DropdownMenuContent, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
import { Eye } from "@lucide/svelte";
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

$effect(() => {
  loadAll();
});

async function loadAll() {
  const { data } = await supabase
    .from("orders")
    .select("id, created_at, subtotal, discount_amount, total_amount, coupon_count")
    .order("created_at", { ascending: false });
  orders = (data as unknown as OrderRow[]) ?? [];

  const ids = orders.map((o) => o.id);
  if (ids.length === 0) {
    itemsByOrder = {};
    return;
  }
  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, quantity, unit_price, line_total, is_treat, products(id,name,price)")
    .in("order_id", ids);
  const map: Record<string, OrderItem[]> = {};
  for (const it of (items as any[] | null) ?? []) {
    const oid = (it as any).order_id as string;
    if (!map[oid]) map[oid] = [];
    map[oid].push(it as any);
  }
  itemsByOrder = map;
}

function money(v: number) {
  return `€${Number(v).toFixed(2)}`;
}
</script>

<section class="space-y-4 p-4">
  <h1 class="text-xl font-semibold">{t('pages.ordersPage.title')}</h1>
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>{t('pages.ordersPage.date')}</TableHead>
          <TableHead class="text-right">{t('orders.subtotal')}</TableHead>
          <TableHead class="text-right">{t('orders.discount')}</TableHead>
          <TableHead class="text-right">{t('orders.total')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each orders as o}
          <TableRow>
            <TableCell class="font-mono text-xs">{o.id.slice(0,8)}</TableCell>
            <TableCell>{formatDateTime(o.created_at)}</TableCell>
            <TableCell class="text-right">{money(o.subtotal)}</TableCell>
            <TableCell class="text-right">- {money(o.discount_amount)}</TableCell>
            <TableCell class="text-right">{money(o.total_amount)}</TableCell>
            <TableCell class="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                    <Eye class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-[28rem]">
                  <div class="p-4 space-y-4">
                    <div class="flex items-center justify-between">
                      <h4 class="font-semibold">{t('orders.orderLabel')} #{o.id.slice(0,8)}</h4>
                      <span class="text-sm text-muted-foreground">{formatDateTime(o.created_at)}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                      <div class="p-2 rounded bg-muted/30">
                        <div class="text-muted-foreground">{t('orders.itemsHeader')}</div>
                        <div class="font-semibold">{(itemsByOrder[o.id] ?? []).length}</div>
                      </div>
                      <div class="p-2 rounded bg-muted/30">
                        <div class="text-muted-foreground">{t('orders.coupons')}</div>
                        <div class="font-semibold">{o.coupon_count}</div>
                      </div>
                      <div class="p-2 rounded bg-muted/30">
                        <div class="text-muted-foreground">{t('orders.treatsWord')}</div>
                        <div class="font-semibold">{(itemsByOrder[o.id] ?? []).filter(i => i.is_treat).length}</div>
                      </div>
                    </div>
                    <div class="space-y-2">
                      <h5 class="font-medium text-sm">{t('orders.itemsHeader')}</h5>
                      {#each itemsByOrder[o.id] ?? [] as item}
                        <div class="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                          <div class="flex items-center gap-2">
                            <span class="font-medium">{item.products.name}</span>
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
                    <div class="border-t pt-3 space-y-1 text-sm">
                      <div class="flex justify-between"><span>{t('orders.subtotal')}</span><span>€{Number(o.subtotal).toFixed(2)}</span></div>
                      {#if o.discount_amount > 0}
                        <div class="flex justify-between text-green-600"><span>{t('orders.discount')}</span><span>-€{Number(o.discount_amount).toFixed(2)}</span></div>
                      {/if}
                      <div class="flex justify-between font-semibold"><span>{t('orders.total')}</span><span>€{Number(o.total_amount).toFixed(2)}</span></div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </Card>
</section>


