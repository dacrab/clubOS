<script lang="ts">
import RecentOrders from "$lib/components/RecentOrders.svelte";
import { closeRegister, ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";

let todayTotal = $state(0);
let closing = $state(false);

import {
  BarChart3,
  ClipboardList,
  LogOut,
  Package,
  ReceiptText,
  ShoppingCart,
  UserCog,
  Users,
} from "@lucide/svelte";
import { toast } from "svelte-sonner";
import LowStockCard from "$lib/components/LowStockCard.svelte";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { t } from "$lib/i18n";
import NewSaleDialog from "$lib/components/NewSaleDialog.svelte";

let ordersCount = $state(0);
let activeUsers = $state(0);
let pendingTasks = $state(0);
let showSale = $state(false);
let productsForSale: Array<{
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
}> = $state([]);

$effect(() => {
  if (typeof window === "undefined") return;
  loadToday();
  loadCounts();
  notifyLowStock();
});

async function loadToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("orders")
    .select("total_amount")
    .gte("created_at", startOfDay.toISOString());
  todayTotal = (data ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.total_amount),
    0
  );
}

async function loadCounts() {
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  ordersCount = count ?? 0;

  const { count: usersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  activeUsers = usersCount ?? 0;

  const { count: tasksCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed");
  pendingTasks = tasksCount ?? 0;
}

async function notifyLowStock() {
  const LOW_STOCK_THRESHOLD_VALUE = 3;
  const LOW_STOCK_SAMPLE_LIMIT = 5;
  const { data } = await supabase
    .from("products")
    .select("name, stock_quantity")
    .lte("stock_quantity", LOW_STOCK_THRESHOLD_VALUE)
    .neq("stock_quantity", -1)
    .order("stock_quantity", { ascending: true })
    .limit(LOW_STOCK_SAMPLE_LIMIT);
  const low =
    (data as Array<{ name: string; stock_quantity: number }> | null) ?? [];
  if (low.length > 0) {
    const names = low.map((p) => `${p.name} (${p.stock_quantity})`).join(", ");
    toast.warning(`Low stock: ${names}`);
  }
}

async function onCloseRegister() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }
  const sessionId = await ensureOpenSession(supabase, user.id);
  closing = true;
  try {
    await closeRegister(supabase, sessionId, null);
  } finally {
    closing = false;
  }
}

async function createSale(payload: {
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
  const discount_amount = Math.max(0, payload.couponCount) * 2;
  const total_amount = Math.max(0, subtotal - discount_amount);
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      session_id: sessionId,
      subtotal,
      discount_amount,
      total_amount,
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
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <BarChart3 class="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold">{t('dashboard.admin.title')}</h1>
        <p class="text-muted-foreground">{t('pages.admin.overview')}</p>
      </div>
    </div>
    <Button onclick={() => (showSale = true)} size="lg" class="gap-2">
      <ShoppingCart class="h-4 w-4" />
      {t('orders.new')}
    </Button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
            <ReceiptText class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">€{todayTotal.toFixed(2)}</p>
            <p class="text-sm text-muted-foreground">{t('dashboard.admin.revenue')}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
            <Package class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{ordersCount}</p>
            <p class="text-sm text-muted-foreground">{t('orders.recent')}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
            <Users class="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{activeUsers}</p>
            <p class="text-sm text-muted-foreground">{t('pages.admin.activeUsers')}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardContent class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
            <ClipboardList class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{pendingTasks}</p>
            <p class="text-sm text-muted-foreground">{t('pages.admin.pendingTasks')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Recent Orders -->
    <div class="lg:col-span-2">
      <Card class="card-hover">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>{t('orders.recent')}</CardTitle>
            <Button variant="ghost" size="sm" href="/admin/orders">
              {t('common.viewAll')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentOrders limit={5} />
        </CardContent>
      </Card>
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- Low Stock -->
      <LowStockCard threshold={10} />

      <!-- Quick Actions -->
      <Card>
        <CardHeader>
          <CardTitle>{t('common.actions')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button href="/admin/products" variant="ghost" class="w-full justify-start">
            <Package class="mr-2 h-4 w-4" />
            {t('nav.products')}
          </Button>
          <Button href="/admin/users" variant="ghost" class="w-full justify-start">
            <UserCog class="mr-2 h-4 w-4" />
            {t('nav.users')}
          </Button>
          <Button href="/admin/registers" variant="ghost" class="w-full justify-start">
            <ClipboardList class="mr-2 h-4 w-4" />
            {t('dashboard.admin.manageRegisters')}
          </Button>
          
          <div class="pt-2 border-t">
            <Button onclick={onCloseRegister} disabled={closing} variant="destructive" class="w-full justify-start">
              <LogOut class="mr-2 h-4 w-4" />
              {closing ? t('dashboard.admin.closing') : t('dashboard.admin.closeRegister')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>

  <NewSaleDialog bind:open={showSale} products={productsForSale} onSubmit={createSale} />
</section>


