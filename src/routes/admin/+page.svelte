<script lang="ts">
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Package,
  ShoppingCart,
  UserCog,
} from "@lucide/svelte";
import { toast } from "svelte-sonner";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import LowStockCard from "$lib/components/LowStockCard.svelte";
import NewSaleDialog from "$lib/components/NewSaleDialog.svelte";
import RecentOrders from "$lib/components/RecentOrders.svelte";
import { Button } from "$lib/components/ui/button";
import { t } from "$lib/i18n";
import { closeRegister, ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";

let showSale = $state(false);
let closing = $state(false);
let productsForSale: Array<{
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
}> = $state([]);

$effect(() => {
  if (typeof window === "undefined") return;
  notifyLowStock();
});

async function notifyLowStock() {
  const THRESHOLD = 3;
  const SAMPLE = 5;
  const { data } = await supabase
    .from("products")
    .select("name, stock_quantity")
    .lte("stock_quantity", THRESHOLD)
    .neq("stock_quantity", -1)
    .order("stock_quantity", { ascending: true })
    .limit(SAMPLE);
  const low =
    (data as Array<{ name: string; stock_quantity: number }> | null) ?? [];
  if (low.length > 0) {
    const names = low
      .map((item) => `${item.name} (${item.stock_quantity})`)
      .join(", ");
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
  // Subtotal includes full value of all items
  const subtotal = payload.items.reduce(
    (acc, item) => acc + Number(item.price),
    0
  );
  // Treat discount equals sum of original prices for treated items
  const treatDiscount = payload.items.reduce(
    (acc, item) => acc + (item.is_treat ? Number(item.price) : 0),
    0
  );
  const couponDiscount = Math.max(0, payload.couponCount) * 2;
  const discount_amount = couponDiscount + treatDiscount;
  const total_amount = Math.max(0, subtotal - discount_amount);
  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      session_id: sessionId,
      subtotal,
      discount_amount,
      total_amount,
      coupon_count: Math.max(0, payload.couponCount),
      created_by: user.id,
    })
    .select()
    .single();
  if (error || !inserted) {
    throw new Error(error?.message || "Failed to create order");
  }
  const items = payload.items.map((product) => ({
    order_id: inserted.id,
    product_id: product.id,
    quantity: 1,
    unit_price: Number(product.price),
    line_total: product.is_treat ? 0 : Number(product.price),
    is_treat: Boolean(product.is_treat),
  }));
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items);
  if (itemsError) {
    throw new Error(itemsError.message);
  }
}
</script>

<PageContent>
  <PageHeader
    title={t("dashboard.admin.title")}
    subtitle={t("pages.admin.overview")}
    icon={BarChart3}
  >
    <Button type="button" size="lg" class="gap-2 rounded-xl px-5" onclick={() => (showSale = true)}>
      <ShoppingCart class="h-4 w-4" />
      {t("orders.new")}
    </Button>
  </PageHeader>

  <div class="grid gap-6 lg:grid-cols-[3fr_2fr] xl:grid-cols-[2fr_1fr]">
    <section class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 px-6 py-6 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-foreground">{t("orders.recent")}</h2>
        <Button variant="ghost" size="sm" class="rounded-lg px-3" href="/admin/orders">
          {t("common.viewAll")}
        </Button>
      </div>
      <div class="mt-5">
        <RecentOrders limit={5} />
      </div>
    </section>

    <aside class="flex flex-col gap-6">
      <section class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 px-6 py-6 shadow-sm">
        <LowStockCard threshold={10} />
      </section>

      <section class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 px-6 py-6 shadow-sm">
        <h3 class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("common.actions")}
        </h3>
        <div class="mt-4 flex flex-col gap-2">
          <Button href="/admin/products" variant="ghost" class="justify-start gap-3 rounded-lg px-3">
            <Package class="h-4 w-4" />
            {t("nav.products")}
          </Button>
          <Button href="/admin/users" variant="ghost" class="justify-start gap-3 rounded-lg px-3">
            <UserCog class="h-4 w-4" />
            {t("nav.users")}
          </Button>
          <Button href="/admin/registers" variant="ghost" class="justify-start gap-3 rounded-lg px-3">
            <ClipboardList class="h-4 w-4" />
            {t("dashboard.admin.manageRegisters")}
          </Button>
        </div>
        <div class="mt-6 border-t border-outline-soft/60 pt-4">
          <Button
            type="button"
            onclick={onCloseRegister}
            disabled={closing}
            variant="destructive"
            class="w-full justify-center gap-2 rounded-lg"
          >
            <LogOut class="h-4 w-4" />
            {closing ? t("dashboard.admin.closing") : t("dashboard.admin.closeRegister")}
          </Button>
        </div>
      </section>
    </aside>
  </div>

  <NewSaleDialog bind:open={showSale} products={productsForSale} onSubmit={createSale} />
</PageContent>
