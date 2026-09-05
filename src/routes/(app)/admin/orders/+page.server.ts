import { and, desc, ilike, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orders } from "$lib/db/schema/orders";
import { loadOrderViews } from "$lib/server/order-views";
import { type DataScope, facilityFilter, resolveFacilityIds } from "$lib/server/scope";
import type { OrderView } from "$lib/types/database";
import { escapeLike } from "$lib/utils/helpers";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	const db = getDb();
	const scope: DataScope = { tenantId: user.tenantId, facilityId: user.facilityId };
	const fids = await resolveFacilityIds(scope);

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const search = url.searchParams.get("search") ?? "";
	const from = (page - 1) * PER_PAGE;

	if (!fids.length) return { orders: [], page, totalPages: 0, search };

	const searchClause = search
		? ilike(sql`${orders.id}::text`, `${escapeLike(search)}%`)
		: undefined;
	const whereClause = searchClause
		? and(facilityFilter(orders.facilityId, fids), searchClause)
		: facilityFilter(orders.facilityId, fids);

	const [countResult, ordersResult] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
		db
			.select()
			.from(orders)
			.where(whereClause)
			.orderBy(desc(orders.createdAt))
			.limit(PER_PAGE)
			.offset(from),
	]);
	const totalCount = Number(countResult[0]?.count ?? 0);

	const ordersWithItems: OrderView[] = await loadOrderViews(ordersResult);

	return {
		orders: ordersWithItems,
		page,
		totalPages: Math.ceil(totalCount / PER_PAGE),
		search,
	};
};
