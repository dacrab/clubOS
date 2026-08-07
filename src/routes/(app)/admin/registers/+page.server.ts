import { desc, eq } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { orders } from "$lib/db/schema/orders";
import { registerSessions } from "$lib/db/schema/register-sessions";
import type { OrderView, RegisterSession } from "$lib/types/database";
import { mapRows } from "$lib/utils/mapper";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();

	const [sessions, allOrders] = await Promise.all([
		db
			.select()
			.from(registerSessions)
			.where(eq(registerSessions.facilityId, user.facilityId ?? ""))
			.orderBy(desc(registerSessions.createdAt)),
		db
			.select()
			.from(orders)
			.where(eq(orders.facilityId, user.facilityId ?? ""))
			.orderBy(desc(orders.createdAt)),
	]);

	return {
		sessions: mapRows<RegisterSession>(sessions),
		orders: mapRows<OrderView>(allOrders),
	};
};
