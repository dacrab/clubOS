import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import { BookingRemindBodySchema } from "$lib/schemas";
import { sendBookingEmail } from "$lib/server/email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingRemindBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	const { id } = parsed.data;
	const db = getDb();
	const rows = await db
		.select({ status: bookings.status, customerEmail: bookings.customerEmail })
		.from(bookings)
		.where(eq(bookings.id, id))
		.limit(1);

	const booking = rows[0];
	if (!booking) return json({ sent: false, reason: "Booking not found" }, { status: 404 });
	if (booking.status === "canceled")
		return json({ sent: false, reason: "Unable to send reminder" });

	return sendBookingEmail(id, "Reminder", "Your booking is coming up!", "View & Manage");
};
