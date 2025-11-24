<script lang="ts">
import { facilityState } from "$lib/state/facility.svelte";
import { userState } from "$lib/state/user.svelte";
import {
	discountsForSession,
	ordersTotalForSession,
} from "$lib/utils/register-stats";
import { supabase } from "$lib/utils/supabase";
import { computeWindow } from "$lib/utils/virtualization";

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
const expanded: Record<string, boolean> = $state({});

// Virtualization
let scrollRef: HTMLDivElement | null = $state(null);
const ROW_HEIGHT = 60;
const VIEW_BUFFER_ROWS = 6;
const VIEWPORT_HEIGHT = 560;
let startIndex = $state(0);
let endIndex = $state(0);
const topPad = $derived(startIndex * ROW_HEIGHT);
const bottomPad = $derived(
	Math.max(0, (sessions.length - endIndex) * ROW_HEIGHT),
);

function recomputeWindow() {
	const scrollTop = scrollRef?.scrollTop ?? 0;
	const { startIndex: s, endIndex: e } = computeWindow(
		scrollTop,
		sessions.length,
		{
			rowHeight: ROW_HEIGHT,
			viewBufferRows: VIEW_BUFFER_ROWS,
			viewportHeight: VIEWPORT_HEIGHT,
		},
	);
	startIndex = s;
	endIndex = e;
}

// Date selection
let startDate = $state<string>("");
let endDate = $state<string>("");

// Computed stats
const totalSessions = $derived(sessions.length);
const openSessions = $derived(
	sessions.filter((session) => !session.closed_at).length,
);
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

// Data loading
async function load() {
	await loadSessions();
	await Promise.all([loadClosings(), loadOrders()]);
	await loadOrderItems();
	resetVirtualWindow();
}

function resetVirtualWindow() {
	startIndex = 0;
	const visibleCount =
		Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + VIEW_BUFFER_ROWS;
	endIndex = Math.min(sessions.length, visibleCount);
}

async function loadSessions() {
	const startISO = startDate
		? new Date(`${startDate}T00:00:00`).toISOString()
		: null;
	const endISO = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;

	// Resolve tenant and selected facility
	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id ?? "";
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.limit(1);
	const tenantId = (tm?.[0]?.tenant_id as string | undefined) ?? null;
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
		.select(
			"session_id, orders_total, treat_total, treat_count, total_discounts, notes",
		)
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
		.select(
			"id, created_at, subtotal, discount_amount, total_amount, coupon_count, session_id",
		)
		.in("session_id", sessionIds)
		.order("created_at", { ascending: false });

	const bySession: Record<string, OrderRow[]> = {};
	for (const order of data ?? []) {
		const sessionId = order.session_id;
		if (!bySession[sessionId]) {
			bySession[sessionId] = [];
		}
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
	const orderIds = Object.values(ordersBySession).flatMap(
		(orders) => orders?.map((o) => o.id) ?? [],
	);

	if (orderIds.length === 0) {
		itemsByOrder = {};
		return;
	}

	const { data } = await supabase
		.from("order_items")
		.select(
			"id, order_id, quantity, unit_price, line_total, is_treat, is_deleted, products(name)",
		)
		.in("order_id", orderIds);

	const map: Record<string, OrderItemRow[]> = {};
	for (const item of data ?? []) {
		if (item.is_deleted) {
			continue;
		}

		const orderId = item.order_id;
		if (!map[orderId]) {
			map[orderId] = [];
		}

		const prod = item.products as unknown;
		const productName = Array.isArray(prod)
			? String((prod as Array<{ name?: string }>)[0]?.name ?? "")
			: String((prod as { name?: string } | null)?.name ?? "");

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

// Utilities
function formatCurrency(value: number | null | undefined): string {
	return `€${Number(value ?? 0).toFixed(2)}`;
}

function toggleSession(id: string) {
	expanded[id] = !expanded[id];
}

function getCouponsCountForSession(sessionId: string): number {
	return (ordersBySession[sessionId] ?? []).reduce(
		(sum, order) => sum + order.coupon_count,
		0,
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
	if (closing && typeof closing.treat_total === "number") {
		return Number(closing.treat_total);
	}
	const orders = ordersBySession[sessionId] ?? [];
	return orders.reduce((sum, o) => {
		const items = itemsByOrder[o.id] ?? [];
		return (
			sum +
			items.reduce((itemSum, it) => {
				if (it.is_treat) {
					return (
						itemSum + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0)
					);
				}
				return itemSum;
			}, 0)
		);
	}, 0);
}
</script>

<PageContent>
  <PageHeader
    title={t("registers.title")}
    subtitle={t("registers.subtitle")}
    icon={ClipboardList}
  />

  <StatsCards
    items={[
      {
        title: t("registers.totalSessions"),
        value: String(totalSessions),
        accent: "neutral",
        icon: ClipboardList,
      },
      {
        title: t("registers.openSessions"),
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
        title: t("registers.totalDiscounts"),
        value: formatCurrency(totalDiscountAmountEffective),
        accent: "green",
        icon: TicketPercent,
      },
      {
        title: t("registers.totalTreats"),
        value: formatCurrency(totalTreatAmountEffective),
        accent: "purple",
        icon: Candy,
      },
    ]}
  />

  <Card
    class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
  >
    <div class="border-b border-outline-soft/60 px-6 py-4">
      <div
        class="text-[11px] font-semibold uppercase text-muted-foreground"
      >
        {t("registers.pickDate")}
      </div>
      <div class="mt-3 max-w-xl">
        <DateRangePicker
          bind:start={startDate}
          bind:end={endDate}
          on:change={load}
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <div
        bind:this={scrollRef}
        onscroll={recomputeWindow}
        style={`max-height:${VIEWPORT_HEIGHT}px; overflow-y:auto;`}
      >
        <Table class="min-w-full">
          <TableHeader>
            <TableRow
              class="border-0 text-xs uppercase text-muted-foreground"
            >
              <TableHead class="rounded-l-xl"
                >{t("registers.id")}</TableHead
              >
              <TableHead>{t("registers.opened")}</TableHead>
              <TableHead>{t("registers.closed")}</TableHead>
              <TableHead class="text-right">{t("orders.total")}</TableHead>
              <TableHead class="text-right">{t("orders.discount")}</TableHead>
              <TableHead class="rounded-r-xl text-right"
                >{t("registers.treats")}</TableHead
              >
            </TableRow>
          </TableHeader>
          <TableBody>
            {#if sessions.length === 0}
              <TableRow>
                <TableCell
                  colspan={6}
                  class="py-16 text-center"
                >
                  <div
                    class="mx-auto flex max-w-sm flex-col items-center gap-4 text-center"
                  >
                    <div
                      class="grid size-16 place-items-center rounded-full bg-muted/30"
                    >
                      <ClipboardList class="size-8 text-muted-foreground/60" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <h3 class="text-base font-semibold text-foreground">
                        {t("registers.empty")}
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        {t("registers.subtitle")}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            {:else}
              {#if topPad > 0}
                <TableRow>
                  <TableCell
                    colspan={6}
                    style={`height:${topPad}px; padding:0; border:0;`}
                  ></TableCell>
                </TableRow>
              {/if}
              {#each sessions.slice(startIndex, endIndex) as session}
                {@const isOpen = !session.closed_at}
                <TableRow
                  class={`cursor-pointer border-b border-outline-soft/40 transition-colors hover:bg-surface-strong/40 ${isOpen ? "bg-primary/5" : ""}`}
                  onclick={() => toggleSession(session.id)}
                >
                  <TableCell class="text-muted-foreground">
                    <div
                      class="font-mono text-[11px] uppercase"
                    >
                      #{session.id.slice(0, 8)}
                    </div>
                    {#if isOpen}
                      <Badge
                        class="ml-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {t("common.open")}
                      </Badge>
                    {:else}
                      <Badge variant="secondary" class="ml-2 rounded-full"
                        >Closed</Badge
                      >
                    {/if}
                    <div class="mt-1 text-xs">
                      {t("orders.coupons")}: {getCouponsCountForSession(
                        session.id,
                      )} •
                      {t("orders.treatsWord")}: {getTreatsCountForSession(
                        session.id,
                      )}
                    </div>
                  </TableCell>
                  <TableCell class="text-sm text-foreground">
                    {formatDateTime(session.opened_at)}
                  </TableCell>
                  <TableCell class="text-sm text-foreground">
                    {#if session.closed_at}
                      <div>{formatDateTime(session.closed_at)}</div>
                      {#if closedBy(session.id)}
                        <div class="text-xs text-muted-foreground">
                          by {closedBy(session.id)}
                        </div>
                      {/if}
                    {:else}
                      —
                    {/if}
                  </TableCell>
                  <TableCell
                    class="text-right text-sm font-medium text-foreground"
                  >
                    {formatCurrency(getOrdersTotalForSession(session.id))}
                  </TableCell>
                  <TableCell
                    class="text-right text-sm font-medium text-foreground"
                  >
                    {formatCurrency(getDiscountsForSession(session.id))}
                  </TableCell>
                  <TableCell
                    class="text-right text-sm font-medium text-foreground"
                  >
                    {formatCurrency(getTreatTotalForSession(session.id))}
                  </TableCell>
                </TableRow>

                {#if (ordersBySession[session.id] ?? []).length > 0}
                  <TableRow class="border-b border-outline-soft/40">
                    <TableCell colspan={6} class="bg-surface-strong/40 p-0">
                      {#if expanded[session.id]}
                        <div class="px-6 py-4">
                          <div
                            class="mb-2 text-xs font-semibold uppercase text-muted-foreground"
                          >
                            {t("orders.recent")} •
                            {t("orders.coupons")}: {getCouponsCountForSession(
                              session.id,
                            )} •
                            {t("orders.treatsWord")}: {getTreatsCountForSession(
                              session.id,
                            )}
                          </div>
                          <div class="flex flex-col gap-2">
                            {#each ordersBySession[session.id] ?? [] as order}
                              <div
                                class="rounded-xl border border-outline-soft/60 bg-surface px-3 py-2 text-sm"
                              >
                                <div
                                  class="flex items-center justify-between gap-3"
                                >
                                  <div class="flex items-center gap-3">
                                    <span
                                      class="font-mono text-[11px] uppercase text-muted-foreground"
                                    >
                                      #{order.id.slice(0, 8)}
                                    </span>
                                    <span class="text-xs text-muted-foreground">
                                      {formatDateTime(order.created_at)}
                                    </span>
                                  </div>
                                  <div class="flex items-center gap-3">
                                    <span class="text-xs text-muted-foreground">
                                      {t("orders.coupons")}: {order.coupon_count}
                                    </span>
                                    <span class="text-xs text-muted-foreground">
                                      {t("orders.discount")} -{formatCurrency(
                                        order.discount_amount,
                                      )}
                                    </span>
                                    <span class="font-semibold"
                                      >{formatCurrency(
                                        order.total_amount,
                                      )}</span
                                    >
                                  </div>
                                </div>
                                <div
                                  class="mt-2 grid gap-1 text-xs text-muted-foreground"
                                >
                                  {#each itemsByOrder[order.id] ?? [] as item}
                                    <div
                                      class="flex items-center justify-between"
                                    >
                                      <div class="flex items-center gap-2">
                                        <span class="text-foreground"
                                          >{item.product_name}</span
                                        >
                                        <span>×{item.quantity}</span>
                                        {#if item.is_treat}
                                          <span
                                            class="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                                          >
                                            {t("orders.free")}
                                          </span>
                                        {/if}
                                      </div>
                                      <div>
                                        {#if item.is_treat}
                                          <span
                                            class="text-muted-foreground line-through"
                                          >
                                            {formatCurrency(item.unit_price)}
                                          </span>
                                          <span class="ml-2 text-foreground"
                                            >€0.00</span
                                          >
                                        {:else}
                                          <span class="text-foreground"
                                            >{formatCurrency(
                                              item.line_total,
                                            )}</span
                                          >
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
              {#if bottomPad > 0}
                <TableRow>
                  <TableCell
                    colspan={6}
                    style={`height:${bottomPad}px; padding:0; border:0;`}
                  ></TableCell>
                </TableRow>
              {/if}
            {/if}
          </TableBody>
        </Table>
      </div>
    </div>
  </Card>
</PageContent>
