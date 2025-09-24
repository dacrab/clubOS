<script lang="ts">
import { Candy, ClipboardList, Clock3, TicketPercent } from "@lucide/svelte";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import StatsCards from "$lib/components/common/StatsCards.svelte";
import { Card } from "$lib/components/ui/card";
import { DateRangePicker } from "$lib/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";
import { Badge } from "$lib/components/ui/badge";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";
import { formatDateTime } from "$lib/utils";

// Types
type SessionRow = {
  id: string;
  opened_at: string;
  opened_by: string;
  closed_at: string | null;
  notes: { opening_cash?: number } | null;
};

type ClosingRow = {
  session_id: string;
  orders_total?: number;
  treat_total: number;
  total_discounts: number;
  treat_count?: number;
  notes: Record<string, unknown> | null;
};

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

// State
let sessions: SessionRow[] = $state([]);
let closingsBySession: Record<string, ClosingRow> = $state({});
let ordersBySession: Record<string, OrderRow[]> = $state({});
let itemsByOrder: Record<string, OrderItemRow[]> = $state({});
let expanded: Record<string, boolean> = $state({});

// Date selection (range)
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
let startDate = $state<string>(`${yyyy}-${mm}-${dd}`);
let endDate = $state<string>(`${yyyy}-${mm}-${dd}`);

// Computed stats
let totalSessions = $derived(sessions.length);
let openSessions = $derived(sessions.filter((session) => !session.closed_at).length);
// deprecated in favor of effective variants
// let totalDiscountAmount = $derived(...)
// let totalTreatAmount = $derived(...)
let totalOrdersAmount = $derived(
  sessions.reduce((sum, s) => sum + getOrdersTotalForSession(s.id), 0)
);

let totalDiscountAmountEffective = $derived(
  sessions.reduce((sum, s) => sum + getDiscountsForSession(s.id), 0)
);

let totalTreatAmountEffective = $derived(
  sessions.reduce((sum, s) => sum + getTreatTotalForSession(s.id), 0)
);

// Initialize
$effect(() => {
  loadCurrentUser().then(() => {
    const user = $currentUser;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (user.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }
    load();
  });
});

// Data loading
async function load() {
  await loadSessions();
  await loadClosings();
  await loadOrders();
  await loadOrderItems();
}

async function loadSessions() {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data } = await supabase
    .from("register_sessions")
    .select("id, opened_at, opened_by, closed_at, notes")
    .or(
      `and(opened_at.gte.${startISO},opened_at.lte.${endISO}),and(opened_at.lt.${endISO},closed_at.gte.${startISO}),and(opened_at.lte.${endISO},closed_at.is.null)`
    )
    .order("opened_at", { ascending: false });

  sessions = data ?? [];
}

async function loadClosings() {
  if (sessions.length === 0) {
    closingsBySession = {};
    return;
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data } = await supabase
    .from("register_closings")
    .select("session_id, orders_total, treat_total, treat_count, total_discounts, notes")
    .in("session_id", sessionIds);

  const map: Record<string, ClosingRow> = {};
  for (const closing of data ?? []) {
    map[closing.session_id] = closing;
  }
  closingsBySession = map;
}

async function loadOrders() {
  if (sessions.length === 0) {
    ordersBySession = {};
    return;
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data } = await supabase
    .from("orders")
    .select("id, created_at, subtotal, discount_amount, total_amount, coupon_count, session_id")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  const bySession: Record<string, OrderRow[]> = {};
  for (const order of data ?? []) {
    const sessionId = order.session_id;
    if (!bySession[sessionId]) bySession[sessionId] = [];
    bySession[sessionId].push({
      id: order.id,
      created_at: order.created_at,
      subtotal: order.subtotal ?? 0,
      discount_amount: order.discount_amount ?? 0,
      total_amount: order.total_amount ?? 0,
      coupon_count: order.coupon_count ?? 0,
    });
  }
  ordersBySession = bySession;
}

async function loadOrderItems() {
  const orderIds = Object.values(ordersBySession)
    .flatMap((orders) => orders?.map((o) => o.id) ?? []);
  
  if (orderIds.length === 0) {
    itemsByOrder = {};
    return;
  }

  const { data } = await supabase
    .from("order_items")
    .select("id, order_id, quantity, unit_price, line_total, is_treat, is_deleted, products(name)")
    .in("order_id", orderIds);

  const map: Record<string, OrderItemRow[]> = {};
  for (const item of data ?? []) {
    const orderId = item.order_id;
    if (!map[orderId]) map[orderId] = [];
    const prod = item.products as unknown;
    const productName = Array.isArray(prod)
      ? String(((prod as Array<{ name?: string }>)[0]?.name) ?? "")
      : String(((prod as { name?: string } | null)?.name) ?? "");
    if (item.is_deleted) continue;
    map[orderId].push({
      id: item.id,
      quantity: item.quantity ?? 0,
      unit_price: item.unit_price ?? 0,
      line_total: item.line_total ?? 0,
      is_treat: item.is_treat ?? false,
      product_name: productName,
    });
  }
  itemsByOrder = map;
}

// Utility functions
function formatCurrency(value: number | null | undefined): string {
  return `€${Number(value ?? 0).toFixed(2)}`;
}

function getCouponsCountForSession(sessionId: string): number {
  return (ordersBySession[sessionId] ?? []).reduce(
    (sum, order) => sum + order.coupon_count,
    0
  );
}

function getTreatsCountForSession(sessionId: string): number {
  const orders = ordersBySession[sessionId] ?? [];
  return orders.reduce((count, order) => {
    const items = itemsByOrder[order.id] ?? [];
    return count + items.filter((item) => item.is_treat).length;
  }, 0);
}

function closedBy(sessionId: string): string | null {
  const notes = closingsBySession[sessionId]?.notes as
    | { closed_by?: string }
    | undefined;
  const val = notes?.closed_by;
  return val ? String(val) : null;
}

function toggleSession(id: string) {
  expanded[id] = !expanded[id];
}

function getOrdersTotalForSession(sessionId: string): number {
  const closing = closingsBySession[sessionId];
  if (closing && typeof closing.orders_total === "number") {
    return Number(closing.orders_total);
  }
  return (ordersBySession[sessionId] ?? []).reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0
  );
}

function getDiscountsForSession(sessionId: string): number {
  const closing = closingsBySession[sessionId];
  if (closing && typeof closing.total_discounts === "number") {
    return Number(closing.total_discounts);
  }
  return (ordersBySession[sessionId] ?? []).reduce(
    (sum, o) => sum + Number(o.discount_amount ?? 0),
    0
  );
}

function getTreatTotalForSession(sessionId: string): number {
  const closing = closingsBySession[sessionId];
  if (closing && typeof closing.treat_total === "number") {
    return Number(closing.treat_total);
  }
  const orders = ordersBySession[sessionId] ?? [];
  let sum = 0;
  for (const o of orders) {
    for (const it of itemsByOrder[o.id] ?? []) {
      if (it.is_treat) {
        sum += Number(it.unit_price ?? 0) * Number(it.quantity ?? 0);
      }
    }
  }
  return sum;
}
</script>

<PageContent>
  <PageHeader
    title={t("pages.registers.title")}
    subtitle={t("pages.registers.subtitle")}
    icon={ClipboardList}
  />

  <StatsCards
    items={[
      {
        title: t("pages.registers.totalSessions"),
        value: String(totalSessions),
        accent: "neutral",
        icon: ClipboardList,
      },
      {
        title: t("pages.registers.openSessions"),
        value: String(openSessions),
        accent: "blue",
        icon: Clock3,
      },
      {
        title: t("orders.total"),
        value: formatCurrency(totalOrdersAmount),
        accent: "neutral",
        icon: ClipboardList,
      },
      {
        title: t("pages.registers.totalDiscounts"),
        value: formatCurrency(totalDiscountAmountEffective),
        accent: "green",
        icon: TicketPercent,
      },
      {
        title: t("pages.registers.totalTreats"),
        value: formatCurrency(totalTreatAmountEffective),
        accent: "purple",
        icon: Candy,
      },
    ]}
  />

  <Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
    <div class="border-b border-outline-soft/70 px-6 py-4">
      <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("pages.registers.pickDate")}</div>
      <div class="mt-2 max-w-xl">
        <DateRangePicker bind:start={startDate} bind:end={endDate} on:change={load} />
      </div>
    </div>

    <div class="overflow-x-auto">
      <Table class="min-w-full">
        <TableHeader>
          <TableRow class="border-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <TableHead class="rounded-l-2xl bg-surface-strong/60">{t("pages.registers.id")}</TableHead>
            <TableHead class="bg-surface-strong/60">{t("pages.registers.opened")}</TableHead>
            <TableHead class="bg-surface-strong/60">{t("pages.registers.closed")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.total")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.discount")}</TableHead>
            <TableHead class="rounded-r-2xl bg-surface-strong/60 text-right">{t("pages.registers.treats")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if sessions.length === 0}
            <TableRow>
              <TableCell colspan={5} class="py-10 text-center text-sm text-muted-foreground">
                {t("pages.registers.empty") ?? t("orders.none")}
              </TableCell>
            </TableRow>
          {:else}
            {#each sessions as session}
              <!-- closing kept available for future use -->
              {@const isOpen = !session.closed_at}
              <TableRow class={`cursor-pointer border-b border-outline-soft/40 ${isOpen ? 'bg-primary/5' : ''}`} onclick={() => toggleSession(session.id)}>
                <TableCell class="text-muted-foreground">
                  <div class="font-mono text-[11px] uppercase tracking-[0.24em]">
                    #{session.id.slice(0, 8)}
                  </div>
                  {#if isOpen}
                    <Badge class="ml-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {t("common.open")}
                    </Badge>
                  {:else}
                    <Badge variant="secondary" class="ml-2 rounded-full">Closed</Badge>
                  {/if}
                  <div class="mt-1 text-xs">
                    {t("orders.coupons")}: {getCouponsCountForSession(session.id)} • {t("orders.treatsWord")}: {getTreatsCountForSession(session.id)}
                  </div>
                </TableCell>
                <TableCell class="text-sm text-foreground">{formatDateTime(session.opened_at)}</TableCell>
                <TableCell class="text-sm text-foreground">
                  {#if session.closed_at}
                    <div>{formatDateTime(session.closed_at)}</div>
                    {#if closedBy(session.id)}
                      <div class="text-xs text-muted-foreground">by {closedBy(session.id)}</div>
                    {/if}
                  {:else}
                    —
                  {/if}
                </TableCell>
                <TableCell class="text-right text-sm font-medium text-foreground">{formatCurrency(getOrdersTotalForSession(session.id))}</TableCell>
                <TableCell class="text-right text-sm font-medium text-foreground">{formatCurrency(getDiscountsForSession(session.id))}</TableCell>
                <TableCell class="text-right text-sm font-medium text-foreground">{formatCurrency(getTreatTotalForSession(session.id))}</TableCell>
              </TableRow>
              
              {#if (ordersBySession[session.id] ?? []).length > 0}
                <TableRow class="border-b border-outline-soft/40">
                  <TableCell colspan={5} class="bg-surface-strong/40 p-0">
                    {#if expanded[session.id]}
                      <div class="px-6 py-4">
                        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t("orders.recent")} • {t("orders.coupons")}: {getCouponsCountForSession(session.id)} • {t("orders.treatsWord")}: {getTreatsCountForSession(session.id)}
                        </div>
                        <div class="flex flex-col gap-2">
                          {#each ordersBySession[session.id] ?? [] as order}
                            <div class="rounded-xl border border-outline-soft/60 bg-surface px-3 py-2 text-sm">
                              <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3">
                                  <span class="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">#{order.id.slice(0,8)}</span>
                                  <span class="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                  <span class="text-xs text-muted-foreground">{t("orders.coupons")}: {order.coupon_count}</span>
                                  <span class="text-xs text-muted-foreground">{t("orders.discount")} -{formatCurrency(order.discount_amount)}</span>
                                  <span class="font-semibold">{formatCurrency(order.total_amount)}</span>
                                </div>
                              </div>
                              <div class="mt-2 grid gap-1 text-xs text-muted-foreground">
                                {#each itemsByOrder[order.id] ?? [] as item}
                                  <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                      <span class="text-foreground">{item.product_name}</span>
                                      <span>×{item.quantity}</span>
                                      {#if item.is_treat}
                                        <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">{t("orders.free")}</span>
                                      {/if}
                                    </div>
                                    <div>
                                      {#if item.is_treat}
                                        <span class="text-muted-foreground line-through">{formatCurrency(item.unit_price)}</span>
                                        <span class="ml-2 text-foreground">€0.00</span>
                                      {:else}
                                        <span class="text-foreground">{formatCurrency(item.line_total)}</span>
                                      {/if}
                                    </div>
                                  </div>
                                {/each}
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </TableCell>
                </TableRow>
              {/if}
            {/each}
          {/if}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>
