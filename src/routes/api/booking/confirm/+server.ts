import { json } from "@sveltejs/kit";
import { BookingConfirmBodySchema } from "$lib/schemas";
import { getVerifiedBooking } from "$lib/server/booking-ownership";
import { sendBookingEmail } from "$lib/server/email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingConfirmBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	const { id } = parsed.data;
	const verified = await getVerifiedBooking(locals.userId, id);
	if (!verified) return json({ sent: false, reason: "Booking not found" }, { status: 403 });
	if (verified.booking.status === "canceled")
		return json({ sent: false, reason: "Unable to send confirmation" });

	return sendBookingEmail(id, "Booking Confirmed", "Your booking is confirmed!", "Manage Booking");
};
