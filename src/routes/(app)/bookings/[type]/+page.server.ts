import { error } from "@sveltejs/kit";
import { and, asc, eq, gte, like, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import { BookingTypeSchema } from "$lib/schemas";
import type { Booking } from "$lib/types/database";
import { mapRows } from "$lib/utils/mapper";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const parsedType = BookingTypeSchema.safeParse(params.type);
	if (!parsedType.success) throw error(404, "Invalid booking type");
	const type = parsedType.data;

	const { user } = await parent();
	const db = getDb();
	const fid = user.facilityId ?? "";

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const search = url.searchParams.get("search") ?? "";
	const from = (page - 1) * PER_PAGE;

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const filters = [
		eq(bookings.type, type),
		eq(bookings.facilityId, fid),
		gte(bookings.startsAt, sevenDaysAgo),
		search ? like(bookings.customerName, `%${search}%`) : undefined,
	].filter(Boolean);

	const [countResult, bookingsResult] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)` })
			.from(bookings)
			.where(and(...filters)),
		db
			.select()
			.from(bookings)
			.where(and(...filters))
			.orderBy(asc(bookings.startsAt))
			.limit(PER_PAGE)
			.offset(from),
	]);

	const totalCount = Number(countResult[0]?.count ?? 0);

	return {
		bookings: mapRows<Booking>(bookingsResult),
		type,
		page,
		totalPages: Math.ceil(totalCount / PER_PAGE),
		search,
	};
};
