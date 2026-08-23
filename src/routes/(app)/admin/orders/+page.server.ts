import { desc, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orders } from "$lib/db/schema/orders";
import { loadOrderViews } from "$lib/server/order-views";
import { type DataScope, resolveFacilityIds } from "$lib/server/scope";
import type { OrderView } from "$lib/types/database";
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

	const baseFilter = sql`facility_id = ANY(${fids})`;
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

	const ordersWithItems: OrderView[] = await loadOrderViews(ordersResult);

	return {
		orders: ordersWithItems,
		page,
		totalPages: Math.ceil(count / PER_PAGE),
		search,
	};
};
