import { json } from "@sveltejs/kit";
import { BookingConfirmBodySchema } from "$lib/schemas";
import { sendBookingEmail } from "$lib/server/email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingConfirmBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	return sendBookingEmail(
		parsed.data.id,
		"Booking Confirmed",
		"Your booking is confirmed!",
		"Manage Booking",
	);
};
