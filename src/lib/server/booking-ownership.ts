import { eq } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import { facilities } from "$lib/db/schema/facilities";
import { resolveUserContext } from "$lib/server/auth";

/**
 * Fetch a booking and verify the caller is allowed to act on it. A caller with a
 * facility membership may only touch bookings of that facility; a tenant-wide
 * member may touch bookings of any facility inside their tenant.
 *
 * Returns the booking row (plus its facility's tenant id) on success, or null
 * when the booking does not exist or does not belong to the caller.
 */
export async function getVerifiedBooking(
	userId: string,
	bookingId: string,
): Promise<{ booking: typeof bookings.$inferSelect; tenantId: string } | null> {
	const ctx = await resolveUserContext(userId);
	const membership = ctx.membership;
	if (!membership) return null;

	const db = getDb();
	const rows = await db
		.select({ booking: bookings, tenantId: facilities.tenantId })
		.from(bookings)
		.innerJoin(facilities, eq(bookings.facilityId, facilities.id))
		.where(eq(bookings.id, bookingId))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	const owns =
		membership.facilityId !== null
			? row.booking.facilityId === membership.facilityId
			: row.tenantId === membership.tenantId;
	if (!owns) return null;

	return { booking: row.booking, tenantId: row.tenantId };
}
