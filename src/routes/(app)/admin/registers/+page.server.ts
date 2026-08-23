import { desc } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orders } from "$lib/db/schema/orders";
import { registerSessions } from "$lib/db/schema/register-sessions";
import { loadOrderViews } from "$lib/server/order-views";
import { facilityFilter, resolveFacilityIds } from "$lib/server/scope";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();
	const fids = await resolveFacilityIds({ tenantId: user.tenantId, facilityId: user.facilityId });

	if (!fids.length) return { sessions: [], orders: [] };

	const [sessions, allOrders] = await Promise.all([
		db
			.select()
			.from(registerSessions)
			.where(facilityFilter(registerSessions.facilityId, fids))
			.orderBy(desc(registerSessions.createdAt)),
		db
			.select()
			.from(orders)
			.where(facilityFilter(orders.facilityId, fids))
			.orderBy(desc(orders.createdAt)),
	]);

	return {
		sessions,
		orders: await loadOrderViews(allOrders),
	};
};
