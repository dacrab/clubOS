import { BookingConfirmBodySchema } from "#lib/schemas.js";
import { getVerifiedBooking } from "#lib/server/booking-ownership.js";
import { sendBookingEmail } from "#lib/server/email.js";
import { ORIGIN } from "$app/env/private";

export async function handleBookingEmail(
	userId: string | null,
	request: Request,
	email: { subjectPrefix: string; heading: string; ctaLabel: string },
): Promise<Response> {
	if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingConfirmBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return Response.json({ error: "Missing booking id" }, { status: 400 });

	const verified = await getVerifiedBooking(userId, parsed.data.id);
	if (!verified)
		return Response.json({ sent: false, reason: "Booking not found" }, { status: 403 });
	if (verified.booking.status === "canceled")
		return Response.json({ sent: false, reason: "Unable to send notification" });

	// Configured ORIGIN wins; otherwise the request URL (never raw headers).
	const origin = ORIGIN ?? new URL(request.url).origin;

	return sendBookingEmail(
		parsed.data.id,
		origin,
		email.subjectPrefix,
		email.heading,
		email.ctaLabel,
	);
}
