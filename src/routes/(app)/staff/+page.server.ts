import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { orders } from "$lib/db/schema/orders";
import { products } from "$lib/db/schema/products";
import { loadOrderViews } from "$lib/server/order-views";
import { facilityFilter, resolveFacilityIds } from "$lib/server/scope";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user, activeSession } = await parent();
	const db = getDb();
	const fids = await resolveFacilityIds({ tenantId: user.tenantId, facilityId: user.facilityId });

	const [recentOrdersResult, sessionSalesResult, productsResult, categoriesResult] =
		await Promise.all([
			activeSession
				? db
						.select()
						.from(orders)
						.where(eq(orders.sessionId, activeSession.id))
						.orderBy(desc(orders.createdAt))
						.limit(5)
				: Promise.resolve([] as (typeof orders.$inferSelect)[]),
			activeSession
				? db
						.select({ total: sql<string>`COALESCE(SUM(total_amount), '0')` })
						.from(orders)
						.where(eq(orders.sessionId, activeSession.id))
				: Promise.resolve([{ total: "0" }]),
			fids.length
				? db
						.select()
						.from(products)
						.where(facilityFilter(products.facilityId, fids))
						.orderBy(products.name)
				: Promise.resolve([] as (typeof products.$inferSelect)[]),
			fids.length
				? db
						.select({
							id: categories.id,
							name: categories.name,
							parentId: categories.parentId,
							description: categories.description,
						})
						.from(categories)
						.where(facilityFilter(categories.facilityId, fids))
						.orderBy(categories.name)
				: Promise.resolve(
						[] as {
							id: string;
							name: string;
							parentId: string | null;
							description: string | null;
						}[],
					),
		]);

	return {
		recentOrders: await loadOrderViews(recentOrdersResult),
		sessionSalesTotal: Number(sessionSalesResult[0]?.total ?? 0),
		products: productsResult,
		categories: categoriesResult,
		activeSession,
	};
};
