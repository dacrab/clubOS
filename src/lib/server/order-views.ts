import { inArray } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orderItems } from "$lib/db/schema/order-items";
import type { orders } from "$lib/db/schema/orders";
import type { OrderItemView, OrderView } from "$lib/types/database";

type OrderRow = typeof orders.$inferSelect;

function toItemViews(items: (typeof orderItems.$inferSelect)[]): OrderItemView[] {
	return items.map((it) => ({
		id: it.id,
		quantity: it.quantity,
		unitPrice: Number(it.unitPrice),
		lineTotal: Number(it.lineTotal),
		isTreat: it.isTreat,
		isDeleted: it.isDeleted,
		productRef: { id: it.productId, name: it.productName },
	}));
}

/** Attach order_items to a batch of order rows and map everything to OrderView. */
export async function loadOrderViews(rows: OrderRow[]): Promise<OrderView[]> {
	const ids = rows.map((o) => o.id);
	const items = ids.length
		? await getDb().select().from(orderItems).where(inArray(orderItems.orderId, ids))
		: [];

	const byOrderId = new Map<string, (typeof orderItems.$inferSelect)[]>();
	for (const item of items) {
		const group = byOrderId.get(item.orderId);
		if (group) group.push(item);
		else byOrderId.set(item.orderId, [item]);
	}

	return rows.map((o) => ({
		id: o.id,
		sessionId: o.sessionId,
		createdAt: o.createdAt.toISOString(),
		subtotal: Number(o.subtotal),
		discountAmount: Number(o.discountAmount),
		totalAmount: Number(o.totalAmount),
		couponCount: o.couponCount,
		orderItems: toItemViews(byOrderId.get(o.id) ?? []),
	}));
}
