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
import OrderDetails from "./OrderDetails.svelte";

const DropdownMenu = DropdownMenuPrimitive.Root;

type OrderRow = {
  id: string;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  coupon_count: number;
};

let orders: OrderRow[] = $state([]);
// Virtualization state
let scrollRef: HTMLDivElement | null = null;
const ROW_HEIGHT = 56; // px, approximate row height
const VIEW_BUFFER_ROWS = 6; // extra rows to render above/below view
const VIEWPORT_HEIGHT = 560; // px container height
let startIndex = $state(0);
let endIndex = $state(0);
let topPad = $derived(startIndex * ROW_HEIGHT);
let bottomPad = $derived(Math.max(0, (orders.length - endIndex) * ROW_HEIGHT));

function recomputeWindow() {
  const scrollTop = scrollRef?.scrollTop ?? 0;
  const visibleCount =
    Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
  const first = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - Math.ceil(VIEW_BUFFER_ROWS / 2)
  );
  startIndex = first;
  endIndex = Math.min(orders.length, first + visibleCount);
}

// Date range (default: today)
let startDate = $state<string>("");
let endDate = $state<string>("");

$effect(() => {
  loadAll();
});

async function loadAll() {
  const startISO = startDate
    ? new Date(`${startDate}T00:00:00`).toISOString()
    : null;
  const endISO = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;
  let query = supabase
    .from("orders")
    .select(
      "id, created_at, subtotal, discount_amount, total_amount, coupon_count"
    )
    .order("created_at", { ascending: false });
  if (startISO) query = query.gte("created_at", startISO);
  if (endISO) query = query.lte("created_at", endISO);
  const { data } = await query;
  orders = (data as OrderRow[] | null) ?? [];
  // reset window on data change
  startIndex = 0;
  const visibleCount =
    Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
  endIndex = Math.min(orders.length, visibleCount);
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

  <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
    <div class="border-b border-outline-soft/60 px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("orders.recent")}
        </h2>
        <span class="text-[12px] text-muted-foreground">
          {t("orders.itemsHeader")} • {orders.length}
        </span>
      </div>
      <div class="mt-4 max-w-xl">
        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("pages.registers.pickDate")}
        </div>
        <div class="mt-3">
          <DateRangePicker bind:start={startDate} bind:end={endDate} on:change={loadAll} />
        </div>
      </div>
    </div>
    <div class="overflow-x-auto">
      <div bind:this={scrollRef} onscroll={recomputeWindow} style={`max-height:${VIEWPORT_HEIGHT}px; overflow-y:auto;`}>
        <Table class="min-w-full">
        <TableHeader>
          <TableRow class="border-0 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <TableHead class="rounded-l-xl bg-surface-strong/60 pl-6">ID</TableHead>
            <TableHead class="bg-surface-strong/60">{t("pages.ordersPage.date")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.subtotal")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.discount")}</TableHead>
            <TableHead class="bg-surface-strong/60 text-right">{t("orders.total")}</TableHead>
            <TableHead class="rounded-r-xl bg-surface-strong/60 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if topPad > 0}
            <TableRow><TableCell colspan={6} style={`height:${topPad}px; padding:0; border:0;`}></TableCell></TableRow>
          {/if}
          {#each orders.slice(startIndex, endIndex) as order}
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
                    <Button variant="ghost" size="icon" class="size-9 rounded-lg border border-outline-soft/70">
                      <Eye class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="w-[30rem] rounded-2xl border border-outline-soft/60 bg-surface-strong/80 backdrop-blur">
                    <OrderDetails order={order} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          {/each}
          {#if bottomPad > 0}
            <TableRow><TableCell colspan={6} style={`height:${bottomPad}px; padding:0; border:0;`}></TableCell></TableRow>
          {/if}
        </TableBody>
        </Table>
      </div>
    </div>
  </Card>
</PageContent>