import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { orderItems } from "$lib/db/schema/order-items";
import { orders } from "$lib/db/schema/orders";
import { products } from "$lib/db/schema/products";
import type { CategoryPartial, OrderItemView, OrderView, Product } from "$lib/types/database";
import { mapRows } from "$lib/utils/mapper";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user, activeSession } = await parent();
	const db = getDb();
	const fid = user.facilityId ?? "";

	const [recentOrdersResult, productsResult, categoriesResult] = await Promise.all([
		activeSession
			? db
					.select()
					.from(orders)
					.where(eq(orders.sessionId, activeSession.id))
					.orderBy(desc(orders.createdAt))
					.limit(5)
			: Promise.resolve([] as Array<typeof orders.$inferSelect>),
		db.select().from(products).where(eq(products.facilityId, fid)).orderBy(products.name),
		db
			.select({
				id: categories.id,
				name: categories.name,
				parentId: categories.parentId,
				description: categories.description,
			})
			.from(categories)
			.where(eq(categories.facilityId, fid))
			.orderBy(categories.name),
	]);

	const orderIds = recentOrdersResult.map((o) => o.id);
	const allItems = orderIds.length
		? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
		: [];

	const itemsByOrderId = new Map<string, typeof allItems>();
	for (const item of allItems) {
		const group = itemsByOrderId.get(item.orderId);
		if (group) group.push(item);
		else itemsByOrderId.set(item.orderId, [item]);
	}

	const ordersWithItems: OrderView[] = recentOrdersResult.map((o) => {
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
		recentOrders: ordersWithItems,
		products: mapRows<Product>(productsResult),
		categories: mapRows<CategoryPartial>(categoriesResult ?? []),
		activeSession,
	};
};
