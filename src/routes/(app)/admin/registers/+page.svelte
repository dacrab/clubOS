<script lang="ts">
import {
	Candy,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	Clock3,
	TicketPercent,
} from "@lucide/svelte";
import { Badge } from "$lib/components/ui/badge";
import { Card } from "$lib/components/ui/card";
import DateRangePicker from "$lib/components/ui/date-picker/date-range-picker.svelte";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import StatsCards from "$lib/components/ui/stats-cards.svelte";
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
import { userState } from "$lib/state/user.svelte";
import { discountsForSession, ordersTotalForSession } from "$lib/utils/register-stats";
import { supabase } from "$lib/utils/supabase";
import { formatCurrency, formatDateTime } from "$lib/utils/utils";

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

// Virtualization
let scrollRef: HTMLDivElement | null = $state(null);
const ROW_HEIGHT = 64;
const VIEW_BUFFER_ROWS = 6;
const VIEWPORT_HEIGHT = 600;
let startIndex = $state(0);
let endIndex = $state(0);
const topPad = $derived(startIndex * ROW_HEIGHT);
const bottomPad = $derived(Math.max(0, (sessions.length - endIndex) * ROW_HEIGHT));

function recomputeWindow() {
	if (!scrollRef) return;
	const scrollTop = scrollRef.scrollTop;
	const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - Math.ceil(VIEW_BUFFER_ROWS / 2));
	startIndex = first;
	endIndex = Math.min(sessions.length, first + visibleCount);
}

// Date selection
let startDate = $state<string>("");
let endDate = $state<string>("");

// Computed stats
const totalSessions = $derived(sessions.length);
const openSessions = $derived(sessions.filter((session) => !session.closed_at).length);
const totalOrdersAmount = $derived(
	sessions.reduce((sum, s) => sum + getOrdersTotalForSession(s.id), 0),
);
const totalDiscountAmountEffective = $derived(
	sessions.reduce((sum, s) => sum + getDiscountsForSession(s.id), 0),
);
const totalTreatAmountEffective = $derived(
	sessions.reduce((sum, s) => sum + getTreatTotalForSession(s.id), 0),
);

// Initialize
$effect(() => {
	userState.load().then(() => {
		load();
	});
});

async function load() {
	await loadSessions();
	await Promise.all([loadClosings(), loadOrders()]);
	await loadOrderItems();
	startIndex = 0;
	endIndex = Math.min(sessions.length, Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS);
}

async function loadSessions() {
	const startISO = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
	const endISO = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;

	const { data: sessionData } = await supabase.auth.getUser();
	const uid = sessionData.user?.id ?? "";
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.limit(1);
	const tenantId = tm?.[0]?.tenant_id;
	const facilityId = await facilityState.resolveSelected();

	let query = supabase
		.from("register_sessions")
		.select("id, opened_at, opened_by, closed_at, notes")
		.order("opened_at", { ascending: false });
	if (tenantId) query = query.eq("tenant_id", tenantId);
	if (facilityId) query = query.eq("facility_id", facilityId);

	if (startISO || endISO) {
		const s = startISO ?? "1970-01-01T00:00:00.000Z";
		const e = endISO ?? "9999-12-31T23:59:59.999Z";
		query = query.or(
			`and(opened_at.gte.${s},opened_at.lte.${e}),and(opened_at.lt.${e},closed_at.gte.${s}),and(opened_at.lte.${e},closed_at.is.null)`,
		);
	}

	const { data } = await query;
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
		bySession[sessionId].push(order);
	}
	ordersBySession = bySession;
}

async function loadOrderItems() {
	const orderIds = Object.values(ordersBySession).flatMap(
		(orders) => orders?.map((o) => o.id) ?? [],
	);
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
		if (item.is_deleted) continue;
		const orderId = item.order_id;
		if (!map[orderId]) map[orderId] = [];
		map[orderId].push({
			...item,
			product_name: (item.products as any)?.name ?? "Unknown",
		});
	}
	itemsByOrder = map;
}

function toggleSession(id: string) {
	expanded[id] = !expanded[id];
}

function getCouponsCountForSession(sessionId: string): number {
	return (ordersBySession[sessionId] ?? []).reduce((sum, order) => sum + order.coupon_count, 0);
}

function getTreatsCountForSession(sessionId: string): number {
	const orders = ordersBySession[sessionId] ?? [];
	return orders.reduce((count, order) => {
		const items = itemsByOrder[order.id] ?? [];
		return count + items.filter((item) => item.is_treat).length;
	}, 0);
}

function closedBy(sessionId: string): string | null {
	const notes = closingsBySession[sessionId]?.notes as { closed_by?: string } | undefined;
	return notes?.closed_by ? String(notes.closed_by) : null;
}

function getOrdersTotalForSession(sessionId: string): number {
	const closing = closingsBySession[sessionId];
	const orders = ordersBySession[sessionId] ?? [];
	return ordersTotalForSession(closing, orders);
}

function getDiscountsForSession(sessionId: string): number {
	const closing = closingsBySession[sessionId];
	const orders = ordersBySession[sessionId] ?? [];
	return discountsForSession(closing, orders);
}

function getTreatTotalForSession(sessionId: string): number {
	const closing = closingsBySession[sessionId];
	if (closing && typeof closing.treat_total === "number") return Number(closing.treat_total);
	const orders = ordersBySession[sessionId] ?? [];
	return orders.reduce((sum, o) => {
		const items = itemsByOrder[o.id] ?? [];
		return (
			sum +
			items.reduce(
				(itemSum, it) =>
					it.is_treat ? itemSum + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0) : itemSum,
				0,
			)
		);
	}, 0);
}
</script>

<PageContent>
  <PageHeader title={t("registers.title")} subtitle={t("registers.subtitle")} />

  <StatsCards
    items={[
      { title: t("registers.totalSessions"), value: String(totalSessions), accent: "neutral", icon: ClipboardList },
      { title: t("registers.openSessions"), value: String(openSessions), accent: "blue", icon: Clock3 },
      { title: t("orders.total"), value: formatCurrency(totalOrdersAmount), accent: "neutral", icon: ClipboardList },
      { title: t("registers.totalDiscounts"), value: formatCurrency(totalDiscountAmountEffective), accent: "green", icon: TicketPercent },
      { title: t("registers.totalTreats"), value: formatCurrency(totalTreatAmountEffective), accent: "purple", icon: Candy },
    ]}
  />

  <Card class="overflow-hidden border-border shadow-sm">
    <div class="flex items-center justify-between border-b border-border/60 p-4">
      <h3 class="text-sm font-medium">{t("registers.pickDate")}</h3>
      <DateRangePicker bind:start={startDate} bind:end={endDate} on:change={load} />
    </div>

    <div
      bind:this={scrollRef}
      onscroll={recomputeWindow}
      style="max-height: {VIEWPORT_HEIGHT}px; overflow-y: auto;"
    >
      <Table>
        <TableHeader class="sticky top-0 bg-card z-10 shadow-sm">
          <TableRow class="hover:bg-transparent border-b border-border/60">
            <TableHead class="w-[100px]">{t("registers.id")}</TableHead>
            <TableHead>{t("registers.opened")}</TableHead>
            <TableHead>{t("registers.closed")}</TableHead>
            <TableHead class="text-right">{t("orders.total")}</TableHead>
            <TableHead class="text-right">{t("orders.discount")}</TableHead>
            <TableHead class="text-right w-[100px]">{t("registers.treats")}</TableHead>
            <TableHead class="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if sessions.length === 0}
            <TableRow>
              <TableCell colspan={7} class="h-96 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <ClipboardList class="size-8 opacity-50" />
                  <p>{t("registers.empty")}</p>
                  <p class="text-xs">{t("registers.subtitle")}</p>
                </div>
              </TableCell>
            </TableRow>
          {:else}
            {#if topPad > 0}
              <tr><td colspan={7} style="height: {topPad}px;"></td></tr>
            {/if}
            
            {#each sessions.slice(startIndex, endIndex) as session (session.id)}
              {@const isOpen = !session.closed_at}
              {@const isExpanded = expanded[session.id]}
              <TableRow 
                class="cursor-pointer h-16 transition-colors {isExpanded ? 'bg-muted/30' : ''}" 
                onclick={() => toggleSession(session.id)}
              >
                <TableCell>
                  <div class="flex flex-col gap-1">
                    <span class="font-mono text-xs text-muted-foreground">#{session.id.slice(0, 8)}</span>
                    {#if isOpen}
                      <Badge variant="default" class="w-fit text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/20 shadow-none">
                        {t("common.open")}
                      </Badge>
                    {:else}
                      <Badge variant="secondary" class="w-fit text-[10px] px-1.5 py-0 h-5 shadow-none">Closed</Badge>
                    {/if}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(session.opened_at)}</TableCell>
                <TableCell>
                  {#if session.closed_at}
                    <div class="flex flex-col">
                      <span>{formatDateTime(session.closed_at)}</span>
                      {#if closedBy(session.id)}
                        <span class="text-xs text-muted-foreground">by {closedBy(session.id)}</span>
                      {/if}
                    </div>
                  {:else}
                    —
                  {/if}
                </TableCell>
                <TableCell class="text-right font-medium">{formatCurrency(getOrdersTotalForSession(session.id))}</TableCell>
                <TableCell class="text-right text-destructive">{formatCurrency(getDiscountsForSession(session.id))}</TableCell>
                <TableCell class="text-right text-primary font-medium">{formatCurrency(getTreatTotalForSession(session.id))}</TableCell>
                <TableCell class="text-center">
                  {#if isExpanded}
                    <ChevronUp class="size-4 text-muted-foreground" />
                  {:else}
                    <ChevronDown class="size-4 text-muted-foreground" />
                  {/if}
                </TableCell>
              </TableRow>

              {#if isExpanded}
                <TableRow class="hover:bg-transparent">
                  <TableCell colspan={7} class="p-0 bg-muted/10 shadow-inner">
                    <div class="p-6 space-y-4">
                      <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("orders.recent")}
                      </div>
                      <div class="grid gap-3">
                        {#each ordersBySession[session.id] ?? [] as order}
                          <div class="rounded-lg border bg-card p-4 shadow-sm">
                            <div class="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                              <div class="flex items-center gap-3">
                                <span class="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                                <span class="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</span>
                              </div>
                              <div class="flex items-center gap-4 text-sm">
                                <div class="text-muted-foreground">
                                  {t("orders.coupons")}: <span class="font-medium text-foreground">{order.coupon_count}</span>
                                </div>
                                {#if order.discount_amount > 0}
                                  <div class="text-destructive">
                                    {t("orders.discount")}: -{formatCurrency(order.discount_amount)}
                                  </div>
                                {/if}
                                <div class="font-bold text-foreground text-base">
                                  {formatCurrency(order.total_amount)}
                                </div>
                              </div>
                            </div>
                            <div class="space-y-1">
                              {#each itemsByOrder[order.id] ?? [] as item}
                                <div class="flex items-center justify-between text-sm">
                                  <div class="flex items-center gap-2">
                                    <span>{item.product_name}</span>
                                    <span class="text-muted-foreground">×{item.quantity}</span>
                                    {#if item.is_treat}
                                      <Badge variant="secondary" class="h-5 text-[10px] px-1.5 bg-purple-500/10 text-purple-700 border-purple-500/20">
                                        {t("orders.free")}
                                      </Badge>
                                    {/if}
                                  </div>
                                  <div>
                                    {#if item.is_treat}
                                      <span class="line-through text-muted-foreground mr-2">{formatCurrency(item.unit_price)}</span>
                                      <span class="font-medium">€0.00</span>
                                    {:else}
                                      <span>{formatCurrency(item.line_total)}</span>
                                    {/if}
                                  </div>
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              {/if}
            {/each}

            {#if bottomPad > 0}
              <tr><td colspan={7} style="height: {bottomPad}px;"></td></tr>
            {/if}
          {/if}
        </TableBody>
      </Table>
    </div>
  </Card>
</PageContent>
