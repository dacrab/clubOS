<script lang="ts">
import { Eye, ShoppingCart } from "@lucide/svelte";
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import DateRangePicker from "$lib/components/ui/date-picker/date-range-picker.svelte";
import { DropdownMenuContent, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table";
import { facilityState } from "$lib/state/facility.svelte";
import { t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatCurrency, formatDateTime } from "$lib/utils/utils";
import OrderDetails from "./order-details.svelte";

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
let startDate = $state<string>("");
let endDate = $state<string>("");

// Virtualization
let scrollRef: HTMLDivElement | null = null;
const ROW_HEIGHT = 53;
const VIEW_BUFFER_ROWS = 6;
const VIEWPORT_HEIGHT = 600;
let startIndex = $state(0);
let endIndex = $state(0);
const topPad = $derived(startIndex * ROW_HEIGHT);
const bottomPad = $derived(Math.max(0, (orders.length - endIndex) * ROW_HEIGHT));

function recomputeWindow() {
	const scrollTop = scrollRef?.scrollTop ?? 0;
	const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - Math.ceil(VIEW_BUFFER_ROWS / 2));
	startIndex = first;
	endIndex = Math.min(orders.length, first + visibleCount);
}

$effect(() => {
	loadAll();
});

async function loadAll() {
	const startISO = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
	const endISO = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;
	const facilityId = await facilityState.resolveSelected();

	let query = supabase
		.from("orders")
		.select("id, created_at, subtotal, discount_amount, total_amount, coupon_count")
		.order("created_at", { ascending: false });

	const { data: sessionData } = await supabase.auth.getUser();
	const userId = sessionData.user?.id;

	if (userId) {
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", userId);
		const tenantId = memberships?.[0]?.tenant_id;
		if (tenantId) query = query.eq("tenant_id", tenantId);
	}

	if (facilityId) query = query.eq("facility_id", facilityId);
	if (startISO) query = query.gte("created_at", startISO);
	if (endISO) query = query.lte("created_at", endISO);

	const { data } = await query;
	orders = (data as OrderRow[]) ?? [];
	startIndex = 0;
	endIndex = Math.min(orders.length, Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS);
}
</script>

<PageContent>
  <PageHeader title={t("orders.list.title")}>
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground mr-2">{t("registers.pickDate")}</span>
      <DateRangePicker bind:start={startDate} bind:end={endDate} onchange={loadAll} />
    </div>
  </PageHeader>

  <Card class="overflow-hidden border-border shadow-sm">
    <div
      bind:this={scrollRef}
      onscroll={recomputeWindow}
      style="max-height: {VIEWPORT_HEIGHT}px; overflow-y: auto;"
    >
      <Table>
        <TableHeader class="sticky top-0 bg-card z-10 shadow-sm">
          <TableRow class="hover:bg-transparent border-b border-border/60">
            <TableHead class="w-[100px]">ID</TableHead>
            <TableHead>{t("orders.list.date")}</TableHead>
            <TableHead class="text-right">{t("orders.subtotal")}</TableHead>
            <TableHead class="text-right">{t("orders.discount")}</TableHead>
            <TableHead class="text-right">{t("orders.total")}</TableHead>
            <TableHead class="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if orders.length === 0}
            <TableRow>
              <TableCell colspan={6} class="h-96 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <ShoppingCart class="size-8 opacity-50" />
                  <p>{t("orders.list.empty.title")}</p>
                  <p class="text-xs">{t("orders.list.empty.description")}</p>
                </div>
              </TableCell>
            </TableRow>
          {:else}
            {#if topPad > 0}
              <tr><td colspan={6} style="height: {topPad}px;"></td></tr>
            {/if}

            {#each orders.slice(startIndex, endIndex) as order (order.id)}
              <TableRow class="h-[53px]">
                <TableCell class="font-mono text-xs text-muted-foreground">
                  #{order.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {formatDateTime(order.created_at)}
                </TableCell>
                <TableCell class="text-right">
                  {formatCurrency(order.subtotal)}
                </TableCell>
                <TableCell class="text-right text-destructive">
                  {#if order.discount_amount > 0}
                    - {formatCurrency(order.discount_amount)}
                  {:else}
                    —
                  {/if}
                </TableCell>
                <TableCell class="text-right font-semibold">
                  {formatCurrency(order.total_amount)}
                </TableCell>
                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon">
                        <Eye class="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[400px] p-0">
                      <OrderDetails {order} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            {/each}

            {#if bottomPad > 0}
              <tr><td colspan={6} style="height: {bottomPad}px;"></td></tr>
            {/if}
          {/if}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>
