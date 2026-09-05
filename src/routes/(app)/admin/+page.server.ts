import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { memberships } from "$lib/db/schema/memberships";
import { orderItems } from "$lib/db/schema/order-items";
import { orders } from "$lib/db/schema/orders";
import { products } from "$lib/db/schema/products";
import { loadOrderViews } from "$lib/server/order-views";
import {
	type DataScope,
	facilityFilter,
	lowStockThreshold,
	resolveFacilityIds,
} from "$lib/server/scope";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user, activeSession } = await parent();
	const db = getDb();
	const scope: DataScope = { tenantId: user.tenantId, facilityId: user.facilityId };
	const fids = await resolveFacilityIds(scope);
	if (!fids.length) {
		return {
			stats: { todayRevenue: 0, todayOrders: 0, lowStockCount: 0, activeUsers: 0 },
			recentOrders: [],
			analytics: { revenueByDay: [], bestSellers: [], categorySales: [] },
			products: [],
			categories: [],
			activeSession,
		};
	}

	const today = sql`CURRENT_DATE`;
	const todayStart = sql`${today}::timestamptz`;
	const todayEnd = sql`${today}::timestamptz + interval '1 day'`;

	const thresholdExpr = lowStockThreshold(scope);

	const [productsResult, categoriesResult, dashboard] = await Promise.all([
		db
			.select()
			.from(products)
			.where(facilityFilter(products.facilityId, fids))
			.orderBy(products.name),
		db
			.select({
				id: categories.id,
				name: categories.name,
				parentId: categories.parentId,
				description: categories.description,
			})
			.from(categories)
			.where(facilityFilter(categories.facilityId, fids))
			.orderBy(categories.name),
		Promise.all([
			db
				.select({ total: sql<string>`COALESCE(SUM(total_amount), '0')` })
				.from(orders)
				.where(
					and(
						facilityFilter(orders.facilityId, fids),
						gte(orders.createdAt, todayStart),
						lte(orders.createdAt, todayEnd),
					),
				),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(orders)
				.where(
					and(
						facilityFilter(orders.facilityId, fids),
						gte(orders.createdAt, todayStart),
						lte(orders.createdAt, todayEnd),
					),
				),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(products)
				.where(
					and(
						facilityFilter(products.facilityId, fids),
						eq(products.trackInventory, true),
						sql`${products.stockQuantity} <= ${thresholdExpr}`,
					),
				),
			scope.facilityId
				? db
						.select({ count: sql<number>`count(*)::int` })
						.from(memberships)
						.where(eq(memberships.facilityId, scope.facilityId))
				: db
						.select({ count: sql<number>`count(*)::int` })
						.from(memberships)
						.where(eq(memberships.tenantId, scope.tenantId ?? "")),
			// best sellers
			db
				.select({
					productName: orderItems.productName,
					totalQty: sql<number>`SUM(${orderItems.quantity})::int`,
				})
				.from(orderItems)
				.where(and(facilityFilter(orderItems.facilityId, fids), eq(orderItems.isDeleted, false)))
				.groupBy(orderItems.productName)
				.orderBy(desc(sql`SUM(${orderItems.quantity})`))
				.limit(10),
			// revenue by day (last 7 days)
			db.execute<{ day: string; revenue: string }>(sql`
				SELECT ${today} - generate_series(0, 6) AS day,
					COALESCE(SUM(o.total_amount), '0') AS revenue
				FROM generate_series(0, 6) AS gs(d)
				LEFT JOIN orders o
					ON o.facility_id = ANY(${fids})
					AND o.created_at::date = CURRENT_DATE - gs.d
				GROUP BY day
				ORDER BY day
			`),
			db
				.select()
				.from(orders)
				.where(facilityFilter(orders.facilityId, fids))
				.orderBy(desc(orders.createdAt))
				.limit(10),
			// sales by category
			db
				.select({
					name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
					quantity: sql<number>`SUM(${orderItems.quantity})::int`,
				})
				.from(orderItems)
				.innerJoin(products, eq(orderItems.productId, products.id))
				.leftJoin(categories, eq(products.categoryId, categories.id))
				.where(and(facilityFilter(orderItems.facilityId, fids), eq(orderItems.isDeleted, false)))
				.groupBy(sql`COALESCE(${categories.name}, 'Uncategorized')`)
				.orderBy(desc(sql`SUM(${orderItems.quantity})`))
				.limit(10),
		]),
	]);

	const [
		todayRev,
		todayOrd,
		lowStock,
		activeUsers,
		bestSellers,
		revenueByDay,
		recentOrdersRows,
		categorySales,
	] = dashboard;

	const recentOrders = await loadOrderViews(recentOrdersRows);

	return {
		stats: {
			todayRevenue: Number(todayRev[0]?.total ?? 0),
			todayOrders: todayOrd[0]?.count ?? 0,
			lowStockCount: lowStock[0]?.count ?? 0,
			activeUsers: activeUsers[0]?.count ?? 0,
		},
		recentOrders,
		analytics: {
			revenueByDay: ((revenueByDay ?? []) as Array<{ day: string; revenue: string }>).map((d) => ({
				date: d.day,
				revenue: Number(d.revenue),
			})),
			bestSellers: (bestSellers ?? []).map((p) => {
				const bp = p as { productName: string; totalQty: number };
				return { id: bp.productName, name: bp.productName, quantity: bp.totalQty };
			}),
			categorySales: (categorySales ?? []).map((c) => ({
				name: c.name,
				quantity: Number(c.quantity ?? 0),
			})),
		},
		products: productsResult,
		categories: categoriesResult,
		activeSession,
	};
};
