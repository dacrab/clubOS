import { json } from "@sveltejs/kit";
import { BookingRemindBodySchema } from "$lib/schemas";
import { getVerifiedBooking } from "$lib/server/booking-ownership";
import { sendBookingEmail } from "$lib/server/email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingRemindBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	const { id } = parsed.data;
	const verified = await getVerifiedBooking(locals.userId, id);
	if (!verified) return json({ sent: false, reason: "Booking not found" }, { status: 403 });
	if (verified.booking.status === "canceled")
		return json({ sent: false, reason: "Unable to send reminder" });

	return sendBookingEmail(id, "Reminder", "Your booking is coming up!", "View & Manage");
};
