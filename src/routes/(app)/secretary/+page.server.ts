import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();

	const now = new Date();
	const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [upcomingBirthdaysResult, upcomingFootballResult, thisMonthTotalResult] = await Promise.all(
		[
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(bookings)
				.where(
					and(
						eq(bookings.facilityId, user.facilityId ?? ""),
						eq(bookings.type, "birthday"),
						gte(bookings.startsAt, now),
					),
				),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(bookings)
				.where(
					and(
						eq(bookings.facilityId, user.facilityId ?? ""),
						eq(bookings.type, "football"),
						gte(bookings.startsAt, now),
					),
				),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(bookings)
				.where(
					and(eq(bookings.facilityId, user.facilityId ?? ""), gte(bookings.startsAt, firstOfMonth)),
				),
		],
	);

	return {
		upcomingBirthdays: upcomingBirthdaysResult[0]?.count ?? 0,
		upcomingFootball: upcomingFootballResult[0]?.count ?? 0,
		thisMonthTotal: thisMonthTotalResult[0]?.count ?? 0,
	};
};
