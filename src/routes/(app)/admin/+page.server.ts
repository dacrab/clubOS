import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { memberships } from "$lib/db/schema/memberships";
import { orderItems } from "$lib/db/schema/order-items";
import { orders } from "$lib/db/schema/orders";
import { products } from "$lib/db/schema/products";
import type { CategoryPartial, OrderItemView, OrderView, Product } from "$lib/types/database";
import { mapRow, mapRows } from "$lib/utils/mapper";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user, activeSession } = await parent();
	const db = getDb();
	const fid: string = user.facilityId ?? "";
	const today = sql`CURRENT_DATE`;
	const todayStart = sql`${today}::timestamptz`;
	const todayEnd = sql`${today}::timestamptz + interval '1 day'`;

	const [productsResult, categoriesResult, dashboard] = await Promise.all([
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
		Promise.all([
			// today revenue
			db
				.select({ total: sql<string>`COALESCE(SUM(total_amount), '0')` })
				.from(orders)
				.where(
					and(
						eq(orders.facilityId, fid),
						gte(orders.createdAt, todayStart),
						lte(orders.createdAt, todayEnd),
					),
				),
			// today orders count
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(orders)
				.where(
					and(
						eq(orders.facilityId, fid),
						gte(orders.createdAt, todayStart),
						lte(orders.createdAt, todayEnd),
					),
				),
			// low stock count
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(products)
				.where(
					and(
						eq(products.facilityId, fid),
						eq(products.trackInventory, true),
						sql`${products.stockQuantity} <= 5`,
					),
				),
			// active users (members in this facility)
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(memberships)
				.where(eq(memberships.facilityId, fid)),
			// best sellers
			db
				.select({
					productName: orderItems.productName,
					totalQty: sql<number>`SUM(${orderItems.quantity})::int`,
					totalRevenue: sql<string>`SUM(${orderItems.lineTotal})`,
				})
				.from(orderItems)
				.where(and(eq(orderItems.facilityId, fid), eq(orderItems.isDeleted, false)))
				.groupBy(orderItems.productName)
				.orderBy(desc(sql`SUM(${orderItems.quantity})`))
				.limit(10),
			// revenue by day (last 7 days)
			db.execute<{ day: string; revenue: string }>(sql`
				SELECT ${today} - generate_series(0, 6) AS day,
					COALESCE(SUM(o.total_amount), '0') AS revenue
				FROM generate_series(0, 6) AS gs(d)
				LEFT JOIN ${orders} o
					ON o.facility_id = ${fid}
					AND o.created_at::date = ${today} - gs.d
				GROUP BY day
				ORDER BY day
			`),
			// recent orders
			db
				.select()
				.from(orders)
				.where(eq(orders.facilityId, fid))
				.orderBy(desc(orders.createdAt))
				.limit(10),
		]),
	]);

	const [todayRev, todayOrd, lowStock, activeUsers, bestSellers, revenueByDay, recentOrders] =
		dashboard;

	return {
		stats: {
			todayRevenue: Number(todayRev[0]?.total ?? 0),
			todayOrders: todayOrd[0]?.count ?? 0,
			lowStockCount: lowStock[0]?.count ?? 0,
			activeUsers: activeUsers[0]?.count ?? 0,
		},
		recentOrders: (recentOrders ?? []).map((o) => ({
			...mapRow<OrderView>(o),
			order_items: [] as OrderItemView[],
		})),
		analytics: {
			revenueByDay: ((revenueByDay ?? []) as Array<{ day: string; revenue: string }>).map((d) => ({
				date: d.day,
				revenue: Number(d.revenue),
			})),
			bestSellers: (bestSellers ?? []).map((p) => {
				const bp = p as { productName: string; totalQty: number; totalRevenue: string };
				return { id: bp.productName, name: bp.productName, quantity: bp.totalQty };
			}),
			categorySales: [] as Array<{ name: string; quantity: number }>,
		},
		products: mapRows<Product>(productsResult),
		categories: mapRows<CategoryPartial>(categoriesResult ?? []),
		activeSession,
	};
};
