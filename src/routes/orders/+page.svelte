<script lang="ts">
import { Package, ReceiptText, ShoppingCart } from "@lucide/svelte";
import RecentOrders from "$lib/components/RecentOrders.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";
import { t } from "$lib/i18n";
import { ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";
import NewSaleDialog from "./NewSaleDialog.svelte";

let showDialog = $state(false);
let products: Array<{ id: string; name: string; price: number }> = $state([]);
let todayTotal = $state(0);
let ordersCount = $state(0);

$effect(() => {
  loadStats();
});

async function loadStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: salesData } = await supabase
    .from("orders")
    .select("total_amount")
    .gte("created_at", startOfDay.toISOString());
  todayTotal = (salesData ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.total_amount),
    0
  );

  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  ordersCount = count ?? 0;
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,category_id,image_url")
    .order("name");
  if (!error && data) products = data as any;
}

function onOpenChange(next: boolean) {
  showDialog = next;
  if (next && products.length === 0) loadProducts();
}

async function submitSaleNew(payload: {
  items: Array<{ id: string; name: string; price: number; is_treat?: boolean }>;
  paymentMethod: "cash";
  couponCount: number;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }
  const sessionId = await ensureOpenSession(supabase, user.id);
  const subtotal = payload.items.reduce(
    (acc, i) => acc + (i.is_treat ? 0 : Number(i.price)),
    0
  );
  const discountAmount = Math.max(0, payload.couponCount) * 2;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      session_id: sessionId,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_method: "cash",
      card_discounts_applied: 0,
      created_by: user?.id,
    })
    .select()
    .single();
  if (orderErr) return;
  const items = payload.items.map((c) => ({
    order_id: order.id,
    product_id: c.id,
    quantity: 1,
    unit_price: Number(c.price),
    line_total: c.is_treat ? 0 : Number(c.price),
    is_treat: !!c.is_treat,
  }));
  await supabase.from("order_items").insert(items);
}
</script>

<section class="space-y-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">Point of Sale</h1>
      <p class="text-muted-foreground text-lg">Process sales and manage transactions</p>
    </div>
    <Button onclick={() => onOpenChange(true)} size="lg" class="px-8 py-3 rounded-xl">
      <ShoppingCart class="mr-2 h-5 w-5" />
      {t('orders.new')}
    </Button>
    <NewSaleDialog bind:open={showDialog} {products} onSubmit={submitSaleNew} />
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
            <ShoppingCart class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</p>
            <p class="text-sm text-muted-foreground">Today's Sales</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
            <ReceiptText class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{ordersCount}</p>
            <p class="text-sm text-muted-foreground">Transactions</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
            <Package class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{products.length}</p>
            <p class="text-sm text-muted-foreground">Products</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Recent Orders -->
  <Card class="card-hover">
    <CardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-xl">{t('orders.recent')}</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">Latest transactions and activities</p>
        </div>
        <Button variant="ghost" size="sm" href="/admin/reports">
          View All
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <RecentOrders limit={5} />
    </CardContent>
  </Card>
</section>


