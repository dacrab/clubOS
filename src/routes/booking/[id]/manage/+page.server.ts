import { error, fail } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import { verifyBookingToken } from "$lib/server/token";
import { mapRow } from "$lib/utils/mapper";
import type { Actions, PageServerLoad } from "./$types";

function validateAccess(params: { id: string }, url: URL): void {
	const token = url.searchParams.get("token");
	if (!token || !verifyBookingToken(params.id, token)) throw error(404, "Booking not found");
}

export const load: PageServerLoad = async ({ params, url }) => {
	validateAccess(params, url);

	const db = getDb();
	const [booking] = await db.select().from(bookings).where(eq(bookings.id, params.id)).limit(1);

	if (!booking) throw error(404, "Booking not found");

	return { booking: mapRow(booking) };
};

export const actions: Actions = {
	cancel: async ({ params, url, request }) => {
		validateAccess(params, url);
		const fd = await request.formData();
		const reason = String(fd.get("reason") ?? "");

		const db = getDb();
		const [existing] = await db
			.select({ status: bookings.status })
			.from(bookings)
			.where(eq(bookings.id, params.id))
			.limit(1);

		if (!existing) return fail(404, { error: "Booking not found" });
		if (existing.status === "canceled") {
			return fail(400, { error: "Booking is already canceled" });
		}

		await db
			.update(bookings)
			.set({
				status: "canceled",
				notes: `Canceled by customer.${reason ? ` Reason: ${reason}` : ""}`,
				updatedAt: sql`now()`,
			})
			.where(eq(bookings.id, params.id));

		return { success: true };
	},

	reschedule: async ({ params, url, request }) => {
		validateAccess(params, url);
		const fd = await request.formData();
		const message = String(fd.get("message") ?? "");

		if (!message) return fail(400, { rescheduleMessage: "Please describe your request" });

		const db = getDb();
		const [existing] = await db
			.select({ notes: bookings.notes })
			.from(bookings)
			.where(eq(bookings.id, params.id))
			.limit(1);

		const priorNotes = existing?.notes ?? "";
		const appended = priorNotes
			? `${priorNotes}\nReschedule requested: ${message}`
			: `Reschedule requested: ${message}`;

		await db
			.update(bookings)
			.set({
				notes: appended,
				updatedAt: sql`now()`,
			})
			.where(eq(bookings.id, params.id));

		return { rescheduleSent: true };
	},
};
