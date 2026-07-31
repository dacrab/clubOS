import { desc, inArray, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orderItems } from "$lib/db/schema/order-items";
import { orders } from "$lib/db/schema/orders";
import type { OrderItemView, OrderView } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	const db = getDb();
	const fid = user.facilityId ?? "";

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const search = url.searchParams.get("search") ?? "";
	const from = (page - 1) * PER_PAGE;

	const baseFilter = sql`facility_id = ${fid}::uuid`;

	const searchClause = search ? sql` AND id::text ILIKE ${`${search}%`}` : sql``;

	const countRows = await db.execute<{ count: number }>(
		sql`SELECT count(*) FROM ${orders} WHERE ${baseFilter}${searchClause}`,
	);
	const count = Number(Array.isArray(countRows) ? countRows[0]?.count : 0);

	const ordersResult = await db
		.select()
		.from(orders)
		.where(sql`${baseFilter}${searchClause}`)
		.orderBy(desc(orders.createdAt))
		.limit(PER_PAGE)
		.offset(from);

	const orderIds = ordersResult.map((o) => o.id);
	const allItems = orderIds.length
		? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
		: [];

	const itemsByOrderId = new Map<string, typeof allItems>();
	for (const item of allItems) {
		const group = itemsByOrderId.get(item.orderId);
		if (group) group.push(item);
		else itemsByOrderId.set(item.orderId, [item]);
	}

	const ordersWithItems: OrderView[] = ordersResult.map((o) => {
		const items = itemsByOrderId.get(o.id) ?? [];
		const orderItemsView: OrderItemView[] = items.map((it) => ({
			id: it.id,
			quantity: it.quantity,
			unit_price: Number(it.unitPrice),
			line_total: Number(it.lineTotal),
			is_treat: it.isTreat,
			is_deleted: it.isDeleted,
			product_ref: { id: it.productId, name: it.productName },
		}));
		return {
			id: o.id,
			session_id: o.sessionId,
			created_at: o.createdAt.toISOString(),
			subtotal: Number(o.subtotal),
			discount_amount: Number(o.discountAmount),
			total_amount: Number(o.totalAmount),
			coupon_count: o.couponCount,
			order_items: orderItemsView,
		};
	});

	return {
		orders: ordersWithItems,
		page,
		totalPages: Math.ceil(count / PER_PAGE),
		search,
	};
};
